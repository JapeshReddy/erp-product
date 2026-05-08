import type { ApiResponse } from "./types.ts";

function respond(body: ApiResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

export function success(
  code: string,
  message: string,
  data?: Record<string, unknown>,
): Response {
  return respond({ success: true, code, message, data });
}

export function failure(
  code: string,
  message: string,
  status = 400,
): Response {
  return respond({ success: false, code, message }, status);
}

export function corsPreflightResponse(): Response {
  return new Response("ok", {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}