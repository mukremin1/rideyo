type InvokeResult = {
  data: Record<string, unknown> | null;
  error: Error | null;
};

const serverApiBase =
  (import.meta.env.VITE_SERVER_API_URL as string | undefined) ||
  (import.meta.env.VITE_PAYMENT_API_URL as string | undefined);

const EDGE_FUNCTION_PATHS = {
  "process-payment": "/api/payments/process",
  "refund-payment": "/api/payments/refund",
  "register-submerchant": "/api/payments/register-submerchant",
  "vehicle-control": "/api/vehicle/control",
  "verify-license": "/api/license/verify",
} as const;

export type EdgeFunctionName = keyof typeof EDGE_FUNCTION_PATHS;

async function invokeViaLocalApi(
  path: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<InvokeResult> {
  const base = serverApiBase!.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    return {
      data,
      error: new Error((data?.error as string) || `API hatası (${res.status})`),
    };
  }
  return { data, error: null };
}

type SupabaseInvoke = (
  name: string,
  options: { body: Record<string, unknown> },
) => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;

/** Edge function — local @supabase/server API veya doğrudan Supabase. */
export async function invokeEdgeFunction(
  functionName: EdgeFunctionName,
  body: Record<string, unknown>,
  accessToken: string,
  supabaseInvoke: SupabaseInvoke,
): Promise<InvokeResult> {
  if (serverApiBase) {
    return invokeViaLocalApi(EDGE_FUNCTION_PATHS[functionName], body, accessToken);
  }

  const { data, error } = await supabaseInvoke(functionName, { body });
  return { data, error: error as Error | null };
}

/** @deprecated invokeEdgeFunction kullanın */
export const invokePaymentFunction = invokeEdgeFunction;

export async function invokeVehicleControl(
  body: Record<string, unknown>,
  accessToken: string,
  supabaseInvoke: SupabaseInvoke,
) {
  return invokeEdgeFunction("vehicle-control", body, accessToken, supabaseInvoke);
}

export async function invokeVerifyLicense(
  body: Record<string, unknown>,
  accessToken: string,
  supabaseInvoke: SupabaseInvoke,
) {
  return invokeEdgeFunction("verify-license", body, accessToken, supabaseInvoke);
}

export function createSupabaseInvoker(
  invoke: (name: string, options: { body: Record<string, unknown> }) => Promise<{
    data: unknown;
    error: Error | null;
  }>,
): SupabaseInvoke {
  return (name, options) =>
    invoke(name, options).then((r) => ({
      data: r.data as Record<string, unknown> | null,
      error: r.error,
    }));
}
