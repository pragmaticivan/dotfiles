import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAdjustedPremium } from "./engine.ts";
import type { PremiumInput } from "./types.ts";

const cleanDriver: PremiumInput = {
  state: "OH",
  vehicleClass: "standard",
  annualMiles: 12_000,
  driver: { age: 40, yearsLicensed: 20, atFaultAccidents: 0, movingViolations: 0, dui: false, yearsClaimFree: 3 },
  discounts: { multiPolicy: false, homeowner: false, paperless: false, telematicsScore: null },
};

test("clean Ohio driver pays the state base rate", () => {
  assert.equal(computeAdjustedPremium(cleanDriver), 71_000);
});

test("one at-fault accident adds twenty percent", () => {
  const input = { ...cleanDriver, driver: { ...cleanDriver.driver, atFaultAccidents: 1 } };
  assert.equal(computeAdjustedPremium(input), 85_200);
});

test("paperless takes three percent off", () => {
  const input = { ...cleanDriver, discounts: { ...cleanDriver.discounts, paperless: true } };
  assert.equal(computeAdjustedPremium(input), 68_870);
});
