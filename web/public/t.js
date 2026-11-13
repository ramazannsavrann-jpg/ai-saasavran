/* AI SaaSavran: yapay zekâdan gelen ziyaretçi sayacı. Çerez yok, kişisel veri yok; yalnız yapay zekâ asistanından gelen ziyaretlerde bildirir. */
(function () {
  try {
    var s = document.currentScript, k = s && s.getAttribute("data-site");
    if (!k) return;
    var r = "", u = "";
    try { r = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ""; } catch (e) {}
    try { u = (new URL(location.href).searchParams.get("utm_source") || "").toLowerCase(); } catch (e) {}
    var t = r + " " + u, src = null;
    var m = [["chatgpt", /(^|\.|\s)(chatgpt\.com|chat\.openai\.com)|chatgpt|openai/], ["perplexity", /perplexity/], ["gemini", /gemini\.google\.com|bard\.google\.com|(^|\s)gemini/],
      ["claude", /claude\.ai|(^|\s)claude/], ["copilot", /copilot\.microsoft\.com|(^|\s)copilot/], ["deepseek", /deepseek/], ["grok", /grok\.com|(^|\s)grok/], ["meta", /(^|\.)meta\.ai/]];
    for (var i = 0; i < m.length; i++) if (m[i][1].test(t)) { src = m[i][0]; break; }
    if (!src) return;
    var sk = "aisv:" + src;
    try { if (sessionStorage.getItem(sk)) return; sessionStorage.setItem(sk, "1"); } catch (e) {}
    var b = JSON.stringify({ k: k, s: src, p: location.pathname });
    var api = (s.getAttribute("data-api") || "https://aisaasavran.com") + "/api/ai-visit";
    if (navigator.sendBeacon) navigator.sendBeacon(api, new Blob([b], { type: "text/plain" }));
    else fetch(api, { method: "POST", body: b, keepalive: true, mode: "cors" });
  } catch (e) {}
})();
