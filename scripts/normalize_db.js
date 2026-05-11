/**
 * Script to normalize WhatsApp numbers and URLs in the Supabase database.
 *
 * USAGE:
 *   Set env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run:
 *     node ./scripts/normalize_db.js
 *
 * The script updates:
 *  - profiles.whatsapp (normalized digits, e.g. 573161112233)
 *  - profiles.dominio (prepend https:// if missing)
 *  - user_services.url_dominio (prepend https:// if missing)
 *  - settings.value where key = 'whatsapp_support'
 */

import { createClient } from "@supabase/supabase-js";
import { normalizeWhatsapp, normalizeUrl } from "../src/utils/formatUtils.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables before running this script.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function updateProfiles() {
  console.log("Fetching profiles...");
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, whatsapp, dominio");
  if (error) throw error;

  for (const p of profiles || []) {
    const wa = normalizeWhatsapp(p.whatsapp);
    const dom = normalizeUrl(p.dominio);
    const updates = {};
    if (wa && wa !== (p.whatsapp || "").replace(/\D/g, ""))
      updates.whatsapp = wa;
    if (dom && dom !== p.dominio) updates.dominio = dom;
    if (Object.keys(updates).length > 0) {
      console.log(`Updating profile ${p.id}:`, updates);
      const { error: upErr } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", p.id);
      if (upErr) console.error("Error updating profile", p.id, upErr);
    }
  }
}

async function updateUserServices() {
  console.log("Fetching user_services...");
  const { data: rows, error } = await supabase
    .from("user_services")
    .select("id, url_dominio");
  if (error) throw error;

  for (const r of rows || []) {
    const dom = normalizeUrl(r.url_dominio);
    if (dom && dom !== r.url_dominio) {
      console.log(`Updating user_service ${r.id}: url_dominio -> ${dom}`);
      const { error: upErr } = await supabase
        .from("user_services")
        .update({ url_dominio: dom })
        .eq("id", r.id);
      if (upErr) console.error("Error updating user_service", r.id, upErr);
    }
  }
}

async function updateSettings() {
  console.log("Checking settings 'whatsapp_support'...");
  const { data, error } = await supabase
    .from("settings")
    .select("id, key, value")
    .eq("key", "whatsapp_support");
  if (error) throw error;
  for (const s of data || []) {
    const wa = normalizeWhatsapp(s.value);
    if (wa && wa !== s.value) {
      console.log(`Updating setting ${s.id} value -> ${wa}`);
      const { error: upErr } = await supabase
        .from("settings")
        .update({ value: wa })
        .eq("id", s.id);
      if (upErr) console.error("Error updating setting", s.id, upErr);
    }
  }
}

async function run() {
  try {
    await updateProfiles();
    await updateUserServices();
    await updateSettings();
    console.log("Normalization complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
