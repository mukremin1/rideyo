import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import type { Context, SupabaseContext } from "@supabase/server";
import { withSupabase as honoWithSupabase } from "@supabase/server/adapters/hono";
import { loadEnvFile } from "./env.js";

loadEnvFile();

type Env = {
  Variables: {
    supabaseContext: SupabaseContext;
  };
};

const app = new Hono<Env>();
const port = Number(process.env.SERVER_PORT ?? process.env.PAYMENT_SERVER_PORT ?? 8787);

app.use(
  "*",
  cors({
    origin: ["http://localhost:8080", "http://127.0.0.1:8080", "http://[::]:8080"],
    allowHeaders: ["authorization", "content-type", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "rideyo-server-api",
    routes: ["/api/payments/*", "/api/vehicle/control", "/api/license/verify"],
  }),
);

async function proxyEdgeFunction(c: Context<Env>, functionName: string) {
  const { supabase } = c.var.supabaseContext;
  const body = await c.req.json();
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    return c.json({ error: error.message }, 502);
  }
  return c.json(data);
}

function authedRoutes() {
  const routes = new Hono<Env>();
  routes.use("*", honoWithSupabase({ auth: "user" }));
  return routes;
}

const payments = authedRoutes();
payments.post("/process", (c) => proxyEdgeFunction(c, "process-payment"));
payments.post("/refund", (c) => proxyEdgeFunction(c, "refund-payment"));
payments.post("/register-submerchant", (c) => proxyEdgeFunction(c, "register-submerchant"));

const vehicle = authedRoutes();
vehicle.post("/control", (c) => proxyEdgeFunction(c, "vehicle-control"));

const license = authedRoutes();
license.post("/verify", (c) => proxyEdgeFunction(c, "verify-license"));

app.route("/api/payments", payments);
app.route("/api/vehicle", vehicle);
app.route("/api/license", license);

console.log(`RideYo server API → http://localhost:${port}`);

serve({ fetch: app.fetch, port });
