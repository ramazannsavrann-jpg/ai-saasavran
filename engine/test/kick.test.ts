import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error: düz JS modülü
import { kickDecision, WORKFLOW_URL } from "../../functions/api/_kick-lib.js";

test("kick: sırada ölçüm yoksa işçi tetiklenmez", () => {
  assert.deepEqual(kickDecision({ queued: 0, hasToken: true }), { dispatch: false, reason: "nothing_queued" });
});
test("kick: anahtar yoksa sessizce atlanır (saatlik sıra geçerli)", () => {
  assert.deepEqual(kickDecision({ queued: 1, hasToken: false }), { dispatch: false, reason: "not_configured" });
});
test("kick: sırada ölçüm ve anahtar varsa tetiklenir", () => {
  assert.equal(kickDecision({ queued: 2, hasToken: true }).dispatch, true);
});
test("kick: depo adı doğrulanır; geçersizse varsayılan depo", () => {
  assert.equal(WORKFLOW_URL("a/b"), "https://api.github.com/repos/a/b/actions/workflows/worker.yml/dispatches");
  assert.match(WORKFLOW_URL("../../evil?x="), /repos\/ramazannsavrann-jpg\/ai-saasavran\/actions/);
  assert.match(WORKFLOW_URL(undefined), /ramazannsavrann-jpg\/ai-saasavran/);
});
