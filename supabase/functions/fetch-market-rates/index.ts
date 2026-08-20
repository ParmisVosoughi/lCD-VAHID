// Fetch live Iranian free-market rates from TGJU and persist to DB.
// Public function (no JWT). Frontend calls this instead of the provider directly.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type AssetDef = {
  code: string;
  name: string;
  type: "currency" | "metal";
  tgjuKey: string;
  unitLabel: string;
};

// TGJU ajax endpoint returns { current: { <key>: { p: "50,414", ... } } }
// Currency & metal prices are already in Iranian Rial.
const ASSETS: AssetDef[] = [
  { code: "USD", name: "دلار آمریکا", type: "currency", tgjuKey: "price_dollar_rl", unitLabel: "هر ۱ دلار" },
  { code: "AED", name: "درهم امارات", type: "currency", tgjuKey: "price_aed", unitLabel: "هر ۱ درهم" },
  { code: "CNY", name: "یوان چین", type: "currency", tgjuKey: "price_cny", unitLabel: "هر ۱ یوان" },
  { code: "EUR", name: "یورو", type: "currency", tgjuKey: "price_eur", unitLabel: "هر ۱ یورو" },
  { code: "GOLD", name: "طلای ۱۸ عیار", type: "metal", tgjuKey: "geram18", unitLabel: "هر گرم" },
  { code: "SILVER", name: "نقره ۹۲۵", type: "metal", tgjuKey: "silver_925", unitLabel: "هر گرم" },
];

const SOURCE_NAME = "TGJU";

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchTgju(): Promise<Record<string, any>> {
  const apiKey = Deno.env.get("TGJU_API_KEY");
  // Public ajax endpoint used by tgju.org widgets. Cache-busted with timestamp.
  const ts = Date.now();
  const urls = [
    `https://call5.tgju.org/ajax.json?_=${ts}${apiKey ? `&token=${encodeURIComponent(apiKey)}` : ""}`,
    `https://call3.tgju.org/ajax.json?_=${ts}${apiKey ? `&token=${encodeURIComponent(apiKey)}` : ""}`,
    `https://call1.tgju.org/ajax.json?_=${ts}${apiKey ? `&token=${encodeURIComponent(apiKey)}` : ""}`,
  ];
  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LovableMarketRates/1.0)",
          Accept: "application/json,*/*",
          Referer: "https://www.tgju.org/",
        },
      });
      if (!res.ok) throw new Error(`TGJU HTTP ${res.status}`);
      const json = await res.json();
      const current = (json && typeof json === "object") ? (json.current ?? json) : null;
      if (!current || typeof current !== "object") throw new Error("Invalid TGJU response");
      return current as Record<string, any>;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`TGJU fetch failed: ${(lastErr as Error)?.message ?? "unknown"}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const current = await fetchTgju();
    const fetchedAt = new Date().toISOString();
    const results: any[] = [];
    const errors: string[] = [];

    for (const a of ASSETS) {
      const item = current[a.tgjuKey];
      const rateInRial = toNumber(item?.p ?? item?.price ?? item);
      if (rateInRial === null) {
        errors.push(`${a.code}: missing value`);
        continue;
      }

      const { data: existing } = await supabase
        .from("market_rates")
        .select("rate_in_rial")
        .eq("asset_code", a.code)
        .maybeSingle();

      const previous = existing?.rate_in_rial ? Number(existing.rate_in_rial) : null;
      const changeAmount = previous !== null ? rateInRial - previous : null;
      const changePercent =
        previous !== null && previous > 0 ? ((rateInRial - previous) / previous) * 100 : null;

      const payload = {
        asset_code: a.code,
        asset_name: a.name,
        asset_type: a.type,
        rate_in_rial: rateInRial,
        unit_label: a.unitLabel,
        source_name: SOURCE_NAME,
        fetched_at: fetchedAt,
        previous_rate_in_rial: previous,
        change_amount: changeAmount,
        change_percent: changePercent,
      };

      const { error: upErr } = await supabase
        .from("market_rates")
        .upsert(payload, { onConflict: "asset_code" });
      if (upErr) {
        errors.push(`${a.code}: ${upErr.message}`);
        continue;
      }

      await supabase.from("market_rate_history").insert({
        asset_code: a.code,
        rate_in_rial: rateInRial,
        unit_label: a.unitLabel,
        source_name: SOURCE_NAME,
        fetched_at: fetchedAt,
      });

      results.push(payload);
    }

    return new Response(
      JSON.stringify({ ok: true, fetched_at: fetchedAt, updated: results.length, results, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("fetch-market-rates error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
