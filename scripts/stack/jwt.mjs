// HS256 JWT üretici (bağımlılıksız). Yalnızca yerel/CI test ortamının anahtarları için.
import { createHmac } from "node:crypto";

const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");

export function signJwt(payload, secret) {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

export function devKeys(secret) {
  const exp = 2_000_000_000; // sabit: anahtarlar her başlatmada aynı kalır (yalnızca test ortamı)
  return {
    anonKey: signJwt({ role: "anon", iss: "supabase-local", exp }, secret),
    serviceKey: signJwt({ role: "service_role", iss: "supabase-local", exp }, secret),
  };
}
