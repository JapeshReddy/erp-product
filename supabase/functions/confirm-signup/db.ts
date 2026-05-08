import type {
  AccessRequest,
  OrgClient,
  ClientAdmin,
  SmtpConfig,
} from "./types.ts";

import { createClient } from "@supabase/supabase-js";

type SupabaseClient = ReturnType<typeof createClient>;

export async function fetchAccessRequest(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: AccessRequest | null; error: unknown }> {
  const { data, error } = await supabase
    .schema("product")
    .from("access_requests")
    .select("id, client_id, status, requested_email")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return { data: data as AccessRequest | null, error };
}

export async function updateAccessRequestStatus(
  supabase: SupabaseClient,
  id: string,
  currentStatus: string,
  newStatus: string,
  now: string,
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .schema("product")
    .from("access_requests")
    .update({ status: newStatus, updated_at: now })
    .eq("id", id)
    .eq("status", currentStatus); // race condition guard

  return { error };
}

export async function fetchOrganization(
  supabase: SupabaseClient,
  clientId: string,
): Promise<{ data: OrgClient | null; error: unknown }> {
  const { data, error } = await supabase
    .schema("product")
    .from("clients")
    .select("id, name, status")
    .eq("id", clientId)
    .single();

  return { data: data as OrgClient | null, error };
}

export async function fetchPrimaryAdmin(
  supabase: SupabaseClient,
  clientId: string,
): Promise<{ data: ClientAdmin[] | null; error: unknown }> {
  const { data, error } = await supabase
    .schema("product")
    .from("client_admins")
    .select("user_id, role, client_id")
    .eq("client_id", clientId)
    .eq("is_primary", true);

  return { data: data as ClientAdmin[] | null, error };
}

export async function fetchSmtpConfig(
  supabase: SupabaseClient,
  clientId: string,
): Promise<{ data: SmtpConfig | null; error: unknown }> {
  const { data, error } = await supabase
    .schema("product")
    .from("client_email_settings")
    .select(
      "smtp_host, port, username, password, from_email, from_name, reply_to_email",
    )
    .eq("client_id", clientId)
    .single();

  return { data: data as SmtpConfig | null, error };
}

export function fetchAvailableRoles(): string[] {
  return ["ADMIN", "ALL_ACCESS", "CREATE", "READ"];
}

export async function insertEmailLog(
  supabase: SupabaseClient,
  params: {
    clientId: string;
    recipientEmail: string;
    emailType: string;
    status: string;
    errorMessage: string | null;
    messageId: string | null;
    metadata: Record<string, unknown>;
    accessRequestId: string;
    sentAt: string | null;
    now: string;
  },
): Promise<void> {
  await supabase.schema("product").from("email_logs").insert({
    client_id: params.clientId,
    recipient_email: params.recipientEmail,
    email_type: params.emailType,
    status: params.status,
    error_message: params.errorMessage,
    provider_message_id: params.messageId,
    metadata: params.metadata,
    access_request_id: params.accessRequestId,
    sent_at: params.sentAt,
    created_at: params.now,
    updated_at: params.now,
  });
}
