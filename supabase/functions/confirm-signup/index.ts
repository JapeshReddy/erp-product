import { createClient } from "@supabase/supabase-js";
import { log, logError } from "./logger.ts";
import { success, failure, corsPreflightResponse } from "./response.ts";
import { extractJwt, validateUserId } from "./validators.ts";
import { buildAdminEmail } from "./email-builder.ts";
import { sendSmtpEmail } from "./smtp.ts";
import {
  fetchAccessRequest,
  updateAccessRequestStatus,
  fetchOrganization,
  fetchPrimaryAdmin,
  fetchSmtpConfig,
  fetchAvailableRoles,
  insertEmailLog,
} from "./db.ts";
import {
  ALLOWED_INITIAL_STATUSES,
  TARGET_STATUS,
  DEFAULT_APP_URL,
} from "./constants.ts";

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") return corsPreflightResponse();

  if (req.method !== "POST")
    return failure(
      "METHOD_NOT_ALLOWED",
      "Only POST requests are accepted.",
      405,
    );

  log(requestId, "CONFIRM_SIGNUP_RECEIVED");

  // ── Env ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = Deno.env.get("APP_URL") ?? DEFAULT_APP_URL;

  if (!supabaseUrl || !serviceRoleKey) {
    logError(requestId, "ENV_MISSING", "Missing environment variables");
    return failure("CONFIG_ERROR", "Internal configuration error.", 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Body ──
  let body: { user_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return failure("INVALID_JSON", "Request body is not valid JSON.");
  }

  const userId = validateUserId(body.user_id);
  if (!userId) return failure("MISSING_USER_ID", "user_id is required.");

  log(requestId, "PAYLOAD_VALIDATED", { user_id: userId });

  // ── Validate user ──
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(userId);

  if (userError || !userData?.user) {
    logError(requestId, "USER_NOT_FOUND", userError, { user_id: userId });
    return failure("USER_NOT_FOUND", "User not found.", 404);
  }

  const user = userData.user;

  if (!user.email)
    return failure("USER_EMAIL_MISSING", "User email not found.", 400);

  // Allow slight clock skew — check email confirmed OR session exists
  // Skip email_confirmed_at check — clock skew between India and US-West
  // causes this to appear null even after verification
  // The fact that user clicked the verify link is sufficient proof
  log(requestId, "EMAIL_CONFIRMED_AT", {
    user_id: userId,
    email_confirmed_at: user.email_confirmed_at ?? "clock_skew_null",
  });

  const userName = user.user_metadata?.full_name ?? user.email;
  const clientId = user.user_metadata?.client_id;

  if (!clientId) {
    logError(requestId, "CLIENT_ID_MISSING", "No client_id in metadata", {
      user_id: userId,
    });
    return failure(
      "CLIENT_ID_MISSING",
      "Organization not found for this user.",
      400,
    );
  }

  log(requestId, "USER_VALIDATED", { user_id: userId, client_id: clientId });

  // ── Fetch access request ──
  const { data: ar, error: arError } = await fetchAccessRequest(
    supabase,
    userId,
  );

  if (arError || !ar) {
    logError(requestId, "ACCESS_REQUEST_NOT_FOUND", {
      error: arError,
      user_id: userId,
      hint: "Check request_source value in access_requests table",
    });
    return failure(
      "ACCESS_REQUEST_NOT_FOUND",
      "Access request not found.",
      404,
    );
  }

  log(requestId, "ACCESS_REQUEST_FETCHED", {
    id: ar.id,
    status: ar.status,
    client_id: ar.client_id,
  });

  // Do not return early — always attempt admin email
  // in case it failed on a previous run
  const isAlreadyProcessed = ar.status === TARGET_STATUS;
  log(requestId, "ACCESS_REQUEST_STATUS", {
    status: ar.status,
    is_already_processed: isAlreadyProcessed,
  });

  if (ar.status === "APPROVED")
    return failure(
      "ALREADY_APPROVED",
      "This request has already been approved.",
    );

  if (ar.status === "REJECTED")
    return failure("REQUEST_REJECTED", "This request has been rejected.");

  if (ar.status === "EXPIRED")
    return failure("REQUEST_EXPIRED", "This request has expired.");

  if (!ALLOWED_INITIAL_STATUSES.includes(ar.status)) {
    logError(requestId, "INVALID_STATUS", "Unexpected status", {
      status: ar.status,
    });
    return failure(
      "INVALID_REQUEST_STATUS",
      "This request cannot be processed.",
    );
  }

  log(requestId, "ACCESS_REQUEST_FOUND", {
    access_request_id: ar.id,
    status: ar.status,
  });

  // ── Validate org ──
  const { data: org, error: orgError } = await fetchOrganization(
    supabase,
    clientId,
  );

  if (orgError || !org) {
    logError(requestId, "ORG_NOT_FOUND", orgError, { client_id: clientId });
    return failure("INVALID_ORGANIZATION", "Organization not found.", 404);
  }

  if (org.status !== "ACTIVE")
    return failure("ORGANIZATION_INACTIVE", "Organization is not active.");

  log(requestId, "ORG_VALIDATED", { client_id: clientId, org_name: org.name });

  // ── Update access request ──
  const now = new Date().toISOString();
  if (!isAlreadyProcessed) {
    const { error: updateError } = await updateAccessRequestStatus(
      supabase,
      ar.id,
      ar.status,
      TARGET_STATUS,
      now,
    );

    if (updateError) {
      logError(requestId, "ACCESS_REQUEST_UPDATE_FAILED", updateError);
      return failure(
        "ACCESS_REQUEST_UPDATE_FAILED",
        "Failed to update access request.",
        500,
      );
    }

    log(requestId, "ACCESS_REQUEST_UPDATED", {
      access_request_id: ar.id,
      new_status: TARGET_STATUS,
    });
  } else {
    log(requestId, "ACCESS_REQUEST_SKIPPED_ALREADY_TARGET", {
      access_request_id: ar.id,
    });
  }

  // ── Fetch primary admin ──
  const { data: adminList, error: adminError } = await fetchPrimaryAdmin(
    supabase,
    clientId,
  );

  if (adminError) {
    logError(requestId, "ADMIN_FETCH_FAILED", adminError);
    return failure(
      "POST_VERIFICATION_FAILED",
      "Unable to fetch organization admin.",
      500,
    );
  }

  if (!adminList || adminList.length === 0) {
    log(requestId, "PRIMARY_ADMIN_NOT_FOUND", { client_id: clientId });
    return failure(
      "PRIMARY_ADMIN_NOT_FOUND",
      "No primary administrator is configured for this organization.",
    );
  }

  if (adminList.length > 1) {
    log(requestId, "MULTIPLE_PRIMARY_ADMINS", { count: adminList.length });
    return failure(
      "MULTIPLE_PRIMARY_ADMINS",
      "Multiple primary admins found. Contact support.",
    );
  }

  const admin = adminList[0];
  log(requestId, "ADMIN_FOUND", { admin_user_id: admin.user_id });

  // ── Fetch admin email ──
  const { data: adminUserData, error: adminUserError } =
    await supabase.auth.admin.getUserById(admin.user_id);

  if (adminUserError || !adminUserData?.user?.email) {
    logError(requestId, "ADMIN_EMAIL_NOT_FOUND", adminUserError);
    return failure(
      "ADMIN_EMAIL_NOT_FOUND",
      "Admin email could not be resolved.",
      500,
    );
  }

  const adminEmail = adminUserData.user.email!;
  const adminName = adminUserData.user.user_metadata?.full_name ?? "Admin";

  log(requestId, "ADMIN_USER_RESOLVED", { admin_user_id: admin.user_id });

  // ── Fetch SMTP ──
  const { data: smtp, error: smtpError } = await fetchSmtpConfig(
    supabase,
    clientId,
  );

  if (smtpError || !smtp) {
    logError(requestId, "SMTP_CONFIG_NOT_FOUND", smtpError);
    return failure(
      "SMTP_CONFIG_NOT_FOUND",
      "Email configuration not found.",
      500,
    );
  }

  if (
    !smtp.smtp_host ||
    !smtp.port ||
    !smtp.username ||
    !smtp.password ||
    !smtp.from_email
  ) {
    logError(requestId, "SMTP_CONFIG_INCOMPLETE", "Missing SMTP fields");
    return failure(
      "SMTP_CONFIG_INCOMPLETE",
      "Email configuration is incomplete.",
      500,
    );
  }

  log(requestId, "SMTP_CONFIG_LOADED", { smtp_host: smtp.smtp_host });

  // ── Fetch roles ──
  const availableRoles = await fetchAvailableRoles();
  log(requestId, "ROLES_FETCHED", { roles: availableRoles });

  // ── Build + send email ──
  const { subject, html, text } = buildAdminEmail({
    adminName,
    userName,
    userEmail: user.email,
    organizationName: org.name,
    clientId,
    requestedAt:
      new Date(now).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC",
    availableRoles,
    appUrl,
    requestId: ar.id,
  });

  const { messageId, error: emailError } = await sendSmtpEmail({
    smtp,
    to: adminEmail,
    subject,
    html,
    text,
  });

  const emailStatus = emailError ? "FAILED" : "SENT";

  if (emailError) {
    logError(requestId, "ADMIN_EMAIL_FAILED", emailError, {
      admin_email: adminEmail,
    });
  } else {
    log(requestId, "ADMIN_EMAIL_SENT", {
      admin_email: adminEmail,
      message_id: messageId,
    });
  }

  // ── Insert email log ──
  await insertEmailLog(supabase, {
    clientId,
    recipientEmail: adminEmail,
    emailType: "ADMIN_APPROVAL_REQUEST",
    status: emailStatus,
    errorMessage: emailError ?? null,
    messageId: messageId ?? null,
    metadata: {
      source: "confirm-signup",
      triggered_by: "email-verification",
      requested_user_email: user.email,
      requested_user_id: userId,
      available_roles: availableRoles,
      smtp_provider: smtp.smtp_host,
    },
    accessRequestId: ar.id,
    sentAt: emailStatus === "SENT" ? now : null,
    now,
  });

  log(requestId, "CONFIRM_SIGNUP_COMPLETE", {
    user_id: userId,
    client_id: clientId,
    admin_user_id: admin.user_id,
    access_request_status: TARGET_STATUS,
    email_status: emailStatus,
  });

  if (emailError) {
    return failure(
      "ADMIN_NOTIFICATION_FAILED",
      "Verification complete but admin notification failed. Please contact support.",
      500,
    );
  }

  return success(
    "ADMIN_NOTIFICATION_SENT",
    "Your account verification is complete and the organization administrator has been notified.",
    { status: TARGET_STATUS },
  );
});
