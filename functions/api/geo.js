// Ziyaretçinin ülkesi (Cloudflare'in belirlediği) ve ücretsiz Gemini'nin o ülkede kullanılıp kullanılamadığı.
// Yeni marka formunda ülke kodunu önceden doldurmak için kullanılır; kişisel veri saklanmaz.
import { geminiRestricted } from "./_check-lib.js";

export async function onRequestGet({ request }) {
  const c = String(request.cf?.country ?? request.headers.get("CF-IPCountry") ?? "").toUpperCase();
  const country = /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1" ? c : "";
  return new Response(JSON.stringify({ country, geminiFree: !geminiRestricted(country) }), {
    headers: { "content-type": "application/json", "cache-control": "private, max-age=3600" },
  });
}
