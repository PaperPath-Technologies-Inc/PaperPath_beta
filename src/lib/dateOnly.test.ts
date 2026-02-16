import { strict as assert } from "node:assert";
import { normalizeDateOnlyOptional } from "@/lib/dateOnly";

function runDateOnlyChecks() {
  const windowsSafe = normalizeDateOnlyOptional("2026-02-15");
  assert.equal(windowsSafe.value, "2026-02-15");
  assert.equal(windowsSafe.error, null);

  const placeholderIgnored = normalizeDateOnlyOptional("AAAA-MM-DD");
  assert.equal(placeholderIgnored.value, null);
  assert.equal(placeholderIgnored.error, null);

  const invalid = normalizeDateOnlyOptional("02/15/2026");
  assert.equal(invalid.value, null);
  assert.equal(invalid.error, "Use YYYY-MM-DD format.");
}

runDateOnlyChecks();
