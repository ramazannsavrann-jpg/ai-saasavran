import { test } from "node:test";
import assert from "node:assert/strict";
import { visitorKind } from "../../functions/api/_check-lib.js";

test("Ücretsiz kontrol istemci türü", () => {
  const mobile = "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
  assert.equal(visitorKind(mobile), "browser");
  assert.equal(visitorKind("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"), "browser");
  assert.equal(visitorKind("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0 Safari/537.36"), "bot");
  assert.equal(visitorKind("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), "bot");
  assert.equal(visitorKind("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0)"), "bot");
  assert.equal(visitorKind("curl/8.5.0"), "script");
  assert.equal(visitorKind("python-requests/2.32"), "script");
  assert.equal(visitorKind(""), "script");
  assert.equal(visitorKind(mobile, { "x-aisv-test": "live-audit" }), "test");
});
