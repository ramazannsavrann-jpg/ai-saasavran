import { test } from "node:test";
import assert from "node:assert/strict";
import { previousSameTypeRun } from "../src/recommendations.ts";

type R = { id: string; status: string; measurement_type: string };
const r = (id: string, type: string, status = "done"): R => ({ id, status, measurement_type: type });

test("İlerleme: önceki ölçüm aynı türden seçilir, mevcut ölçümle aynı olmaz", () => {
  // En yeni başta. Son canlı ölçüm R2; önceki canlı ölçüm R3 olmalı (R1 aramasız, araya girmez)
  const runs = [r("R1", "model_knowledge"), r("R2", "live_search"), r("R3", "live_search")];
  assert.equal(previousSameTypeRun(runs, "live_search")?.id, "R3");
});

test("İlerleme: son ölçüm canlı ise önceki aramasız ölçüm kıyaslamaya girmez", () => {
  const runs = [r("R1", "live_search"), r("R2", "model_knowledge"), r("R3", "live_search")];
  assert.equal(previousSameTypeRun(runs, "live_search")?.id, "R3");
});

test("İlerleme: yalnız bir ölçüm varsa önceki yok; tamamlanmamış ölçümler sayılmaz", () => {
  assert.equal(previousSameTypeRun([r("R1", "live_search")], "live_search"), undefined);
  const runs = [r("R1", "live_search"), r("R2", "live_search", "running"), r("R3", "live_search", "failed")];
  assert.equal(previousSameTypeRun(runs, "live_search"), undefined);
});
