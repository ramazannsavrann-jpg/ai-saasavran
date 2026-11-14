import assert from "node:assert/strict";
import { test } from "node:test";
import { csvCell, fileSlug, toCsv } from "../../web/src/lib/csv.ts";

test("csv: tırnak, ayırıcı ve satır sonu kaçışlanır", () => {
  assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(csvCell('say "x"'), '"say ""x"""');
  assert.equal(csvCell("a\nb"), '"a\nb"');
  assert.equal(csvCell(null), "");
});

test("csv: formül gibi başlayan hücre etkisizleştirilir, sayı bozulmaz", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")").startsWith("\"'="), true);
  assert.equal(csvCell("+90 555"), "'+90 555");
  assert.equal(csvCell("@kullanici"), "'@kullanici");
  assert.equal(csvCell(-3), "-3");
  assert.equal(csvCell("-0,5"), '"-0,5"'); // virgül ayırıcı olabilir: tırnaklanır, formül sayılmaz
});

test("csv: BOM ve CRLF ile birleşir; dosya adı güvenli", () => {
  assert.equal(toCsv([["a", "b"], [1, 2]]), "﻿a;b\r\n1;2\r\n");
  assert.equal(fileSlug("Çiçek Evi / Café!"), "cicek-evi-cafe");
});
