/** iyzico REST API helper (IYZWS v2 auth) for Supabase Edge Functions */

export type IyzicoConfig = {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
};

export function getIyzicoConfig(): IyzicoConfig | null {
  const apiKey = Deno.env.get("IYZICO_API_KEY");
  const secretKey = Deno.env.get("IYZICO_SECRET_KEY");
  if (!apiKey || !secretKey) return null;

  const sandbox = Deno.env.get("IYZICO_SANDBOX") !== "false";
  const baseUrl = sandbox
    ? "https://sandbox-api.iyzipay.com"
    : "https://api.iyzipay.com";

  return { apiKey, secretKey, baseUrl };
}

function randomKey(): string {
  const ts = Date.now().toString();
  const rnd = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(rnd, (b) => b.toString(16).padStart(2, "0")).join("");
  return ts + hex;
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildAuthHeader(
  uriPath: string,
  body: string,
  config: IyzicoConfig,
): Promise<{ authorization: string; randomKey: string }> {
  const rnd = randomKey();
  const payload = rnd + uriPath + body;
  const signature = await hmacSha256Hex(payload, config.secretKey);
  const token = btoa(`${config.apiKey}:${signature}`);
  return { authorization: `IYZWSv2 ${token}`, randomKey: rnd };
}

export type IyzicoResponse = Record<string, unknown> & {
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  paymentId?: string;
  conversationId?: string;
  threeDSHtmlContent?: string;
  payWithIyzicoPageUrl?: string;
  token?: string;
  subMerchantKey?: string;
  cardUserKey?: string;
  cardToken?: string;
  cardAssociation?: string;
  lastFourDigits?: string;
};

export async function iyzicoPost(
  uriPath: string,
  body: Record<string, unknown>,
  config?: IyzicoConfig,
): Promise<IyzicoResponse> {
  const cfg = config ?? getIyzicoConfig();
  if (!cfg) throw new Error("iyzico yapılandırması eksik");

  const bodyStr = JSON.stringify(body);
  const { authorization, randomKey: rnd } = await buildAuthHeader(uriPath, bodyStr, cfg);

  const res = await fetch(`${cfg.baseUrl}${uriPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
      "x-iyzi-rnd": rnd,
    },
    body: bodyStr,
  });

  return (await res.json()) as IyzicoResponse;
}

export function formatPrice(amount: number): string {
  return amount.toFixed(2);
}

export function isIyzicoSuccess(res: IyzicoResponse): boolean {
  return res.status === "success";
}

export function getCallbackBaseUrl(): string {
  return (
    Deno.env.get("IYZICO_CALLBACK_BASE_URL") ??
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-callback`
  );
}

export function getAppReturnUrl(bookingId: string): string {
  const base = Deno.env.get("APP_URL") ?? "https://rideyo.app";
  return `${base}/payment/callback?bookingId=${bookingId}`;
}

export function platformCommissionRate(): number {
  const raw = Deno.env.get("PLATFORM_COMMISSION_RATE");
  const rate = raw ? parseFloat(raw) : 0.15;
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0.15;
}
