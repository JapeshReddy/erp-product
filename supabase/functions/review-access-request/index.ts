import { createClient } from "@supabase/supabase-js";
import nodemailer from "npm:nodemailer@6";
import { log, logError } from "./logger.ts";
import { success, failure, corsPreflightResponse } from "./response.ts";
import { validatePayload } from "./validators.ts";
import { buildApprovalEmail, buildRejectionEmail } from "./email-builder.ts";
import type { AccessRequest, SmtpConfig } from "./types.ts";

const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5173";

async function sendEmail(params: {
  smtp: SmtpConfig;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ messageId: string | null; error: string | null }> {
  try {
    const transporter = nodemailer.createTransport({
      host: params.smtp.smtp_host,
      port: params.smtp.port,
      secure: params.smtp.port === 465,
      auth: { user: params.smtp.username, pass: params.smtp.password },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: params.smtp.from_name
        ? `${params.smtp.from_name} <${params.smtp.from_email}>`
        : params.smtp.from_email,
      to: params.to,
      replyTo: params.smtp.reply_to_email ?? params.smtp.from_email,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    return { messageId: info.messageId ?? crypto.randomUUID(), error: null };
  } catch (err) {
    return {
      messageId: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") return corsPreflightResponse();

  if (req.method !== "POST")
    return failure(
      "METHOD_NOT_ALLOWED",
      "Only POST requests are accepted.",
      405,
    );

  log(requestId, "REVIEW_REQUEST_RECEIVED");

  // ── Env ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    logError(requestId, "ENV_MISSING", "Missing environment variables");
    return failure("CONFIG_ERROR", "Internal configuration error.", 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Parse body ──
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return failure("INVALID_JSON", "Request body is not valid JSON.");
  }

  const validation = validatePayload(rawBody);
  if (!validation.valid || !validation.data)
    return failure("VALIDATION_ERROR", validation.error ?? "Invalid request.");

  const { requestId: arId, action, roles, reason } = validation.data;

  log(requestId, "PAYLOAD_VALIDATED", { action, request_id: arId });

  // ── Fetch access request ──
  const { data: arData, error: arError } = await supabase
    .schema("product")
    .from("access_requests")
    .select("*")
    .eq("id", arId)
    .single();

  if (arError || !arData)
    return failure("REQUEST_NOT_FOUND", "Access request not found.", 404);

  const ar = arData as AccessRequest;

  // ── Check status ──
  if (ar.status === "APPROVED")
    return failure(
      "ALREADY_APPROVED",
      "This request has already been approved.",
    );

  if (ar.status === "REJECTED")
    return failure(
      "ALREADY_REJECTED",
      "This request has already been rejected.",
    );

  if (ar.status !== "PENDING_ADMIN_APPROVAL")
    return failure(
      "INVALID_STATUS",
      "This request cannot be processed in its current state.",
    );

  const now = new Date().toISOString();

  // ── Fetch user details ──
  const { data: userData } = await supabase.auth.admin.getUserById(ar.user_id);
  const userName =
    userData?.user?.user_metadata?.full_name ?? ar.requested_email;

  // ── Fetch org name ──
  const { data: orgData } = await supabase
    .schema("product")
    .from("clients")
    .select("name")
    .eq("id", ar.client_id)
    .single();

  const orgName = orgData?.name ?? ar.client_id;

  // ── Fetch SMTP ──
  const { data: smtpData, error: smtpError } = await supabase
    .schema("product")
    .from("client_email_settings")
    .select(
      "smtp_host, port, username, password, from_email, from_name, reply_to_email",
    )
    .eq("client_id", ar.client_id)
    .single();

  if (smtpError || !smtpData)
    return failure(
      "SMTP_CONFIG_NOT_FOUND",
      "Email configuration not found.",
      500,
    );

  const smtp = smtpData as SmtpConfig;

  // ────────────────────────────────────────
  // APPROVE
  // ────────────────────────────────────────
  if (action === "APPROVE") {
    const { error: updateError } = await supabase
      .schema("product")
      .from("access_requests")
      .update({
        status: "APPROVED",
        approved_at: now,
        updated_at: now,
        assigned_role: roles?.[0] ?? null,
      })
      .eq("id", arId);

    if (updateError) {
      logError(requestId, "APPROVE_UPDATE_FAILED", updateError);
      return failure("APPROVE_FAILED", "Failed to approve request.", 500);
    }

    const { error: clientUserError } = await supabase
      .schema("product")
      .from("client_users")
      .upsert(
        {
          user_id: ar.user_id,
          client_id: ar.client_id,
          approved_at: now,
          is_active: true,
          updated_at: now,
        },
        { onConflict: "user_id,client_id" },
      );

    if (clientUserError) {
      logError(requestId, "CLIENT_USER_UPSERT_FAILED", clientUserError);
    }

    log(requestId, "REQUEST_APPROVED", { request_id: arId, roles });

    const { subject, html, text } = buildApprovalEmail({
      userName,
      userEmail: ar.requested_email,
      organizationName: orgName,
      assignedRoles: roles ?? [],
      approvedAt:
        new Date(now).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC",
      appUrl: APP_URL,
    });

    const { messageId, error: emailError } = await sendEmail({
      smtp,
      to: ar.requested_email,
      subject,
      html,
      text,
    });

    const emailStatus = emailError ? "FAILED" : "SENT";
    if (emailError) logError(requestId, "APPROVAL_EMAIL_FAILED", emailError);
    else log(requestId, "APPROVAL_EMAIL_SENT", { message_id: messageId });

    await supabase
      .schema("product")
      .from("email_logs")
      .insert({
        client_id: ar.client_id,
        recipient_email: ar.requested_email,
        email_type: "ACCESS_APPROVED",
        status: emailStatus,
        error_message: emailError ?? null,
        provider_message_id: messageId ?? null,
        metadata: { source: "review-access-request", action: "APPROVE", roles },
        access_request_id: arId,
        sent_at: emailStatus === "SENT" ? now : null,
        created_at: now,
        updated_at: now,
      });

    return success("APPROVED", "Access request approved successfully.", {
      request_id: arId,
      roles,
    });
  }

  // ────────────────────────────────────────
  // REJECT
  // ────────────────────────────────────────
  if (action === "REJECT") {
    const { error: updateError } = await supabase
      .schema("product")
      .from("access_requests")
      .update({
        status: "REJECTED",
        rejected_reason: reason,
        approved_at: now,
        updated_at: now,
      })
      .eq("id", arId);

    if (updateError) {
      logError(requestId, "REJECT_UPDATE_FAILED", updateError);
      return failure("REJECT_FAILED", "Failed to reject request.", 500);
    }

    log(requestId, "REQUEST_REJECTED", { request_id: arId, reason });

    const { subject, html, text } = buildRejectionEmail({
      userName,
      organizationName: orgName,
      rejectionReason: reason!,
      rejectedAt:
        new Date(now).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC",
    });

    const { messageId, error: emailError } = await sendEmail({
      smtp,
      to: ar.requested_email,
      subject,
      html,
      text,
    });

    const emailStatus = emailError ? "FAILED" : "SENT";
    if (emailError) logError(requestId, "REJECTION_EMAIL_FAILED", emailError);
    else log(requestId, "REJECTION_EMAIL_SENT", { message_id: messageId });

    await supabase
      .schema("product")
      .from("email_logs")
      .insert({
        client_id: ar.client_id,
        recipient_email: ar.requested_email,
        email_type: "ACCESS_REJECTED",
        status: emailStatus,
        error_message: emailError ?? null,
        provider_message_id: messageId ?? null,
        metadata: { source: "review-access-request", action: "REJECT", reason },
        access_request_id: arId,
        sent_at: emailStatus === "SENT" ? now : null,
        created_at: now,
        updated_at: now,
      });

    return success("REJECTED", "Access request rejected.", {
      request_id: arId,
    });
  }

  return failure("INVALID_ACTION", "Invalid action.");
});
