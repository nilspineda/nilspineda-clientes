import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const allowedOrigin = Deno.env.get("TELEMETRY_ALLOWED_ORIGIN") || "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "method not allowed" }),
      { status: 405, headers: corsHeaders() },
    );
  }

  try {
    const body = await req.json();
    const event = body.event || null;
    const payload = body.payload || null;
    const ts = body.ts || new Date().toISOString();
    const href = body.href || null;

    console.log("telemetry event", {
      event,
      payload,
      ts,
      href,
      ip: req.headers.get("x-forwarded-for"),
    });

    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin
          .from("telemetry")
          .insert([{ event, payload, ts, href }]);
        if (error) console.error("telemetry insert error", error);
      } catch (e) {
        console.error("telemetry db insert exception", e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: corsHeaders(),
    });
  } catch (e) {
    console.error("telemetry parse error", e);
    return new Response(
      JSON.stringify({ ok: false, error: "invalid payload" }),
      { status: 400, headers: corsHeaders() },
    );
  }
});
