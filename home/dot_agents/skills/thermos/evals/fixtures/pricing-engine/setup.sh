#!/usr/bin/env bash
set -euo pipefail

export GIT_AUTHOR_NAME="Sam Okafor" GIT_AUTHOR_EMAIL="sam.okafor@example.com"
export GIT_COMMITTER_NAME="Sam Okafor" GIT_COMMITTER_EMAIL="sam.okafor@example.com"
at() { export GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1"; }

stash=$(mktemp -d)
mv src/pricing/engine.ts "$stash/"

git init -q -b main
echo setup.sh >> .git/info/exclude
git config user.name "Sam Okafor"
git config user.email "sam.okafor@example.com"

cat > package.json <<'EOF'
{
  "name": "pricing-service",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test 'src/**/*.test.ts'"
  }
}
EOF

cat > src/pricing/baseRate.ts <<'EOF'
import type { StateCode, VehicleClass } from "./types.ts";

const STATE_BASE_CENTS: Record<StateCode, number> = {
  MA: 98_000,
  NY: 121_000,
  CA: 104_000,
  TX: 87_000,
  FL: 132_000,
  OH: 71_000,
};

const VEHICLE_FACTOR: Record<VehicleClass, number> = {
  economy: 0.9,
  standard: 1.0,
  luxury: 1.35,
  sports: 1.6,
  truck: 1.1,
};

function mileageFactor(annualMiles: number): number {
  if (annualMiles > 15_000) return 1.1;
  if (annualMiles < 7_500) return 0.95;
  return 1;
}

export function baseRateFor(state: StateCode, vehicleClass: VehicleClass, annualMiles: number): number {
  return Math.round(STATE_BASE_CENTS[state] * VEHICLE_FACTOR[vehicleClass] * mileageFactor(annualMiles));
}
EOF

cat > src/pricing/surcharges.ts <<'EOF'
import type { DriverProfile } from "./types.ts";

export function applySurcharges(premium: number, driver: DriverProfile): number {
  let factor = 1;
  factor += 0.2 * driver.atFaultAccidents;
  factor += 0.1 * driver.movingViolations;
  if (driver.dui) factor += 0.5;
  if (driver.age < 25) factor += 0.3;
  if (driver.yearsLicensed < 3) factor += 0.15;
  return Math.round(premium * factor);
}
EOF

cat > src/pricing/discounts.ts <<'EOF'
import type { DiscountProfile, DriverProfile } from "./types.ts";

export const MAX_TOTAL_DISCOUNT = 0.25;

export function applyDiscounts(premium: number, discounts: DiscountProfile, driver: DriverProfile): number {
  let total = 0;
  if (discounts.multiPolicy) total += 0.1;
  if (driver.yearsClaimFree >= 5) total += 0.12;
  if (discounts.paperless) total += 0.03;
  if (discounts.homeowner) total += 0.05;
  if (discounts.telematicsScore !== null && discounts.telematicsScore >= 80) total += 0.08;
  return Math.round(premium * (1 - Math.min(total, MAX_TOTAL_DISCOUNT)));
}
EOF

cat > src/pricing/engine.ts <<'EOF'
import { baseRateFor } from "./baseRate.ts";
import { applyDiscounts } from "./discounts.ts";
import { applySurcharges } from "./surcharges.ts";
import type { PremiumInput } from "./types.ts";

export const MIN_PREMIUM_CENTS = 30_000;

export function computeAdjustedPremium(input: PremiumInput): number {
  const base = baseRateFor(input.state, input.vehicleClass, input.annualMiles);
  const surcharged = applySurcharges(base, input.driver);
  const discounted = applyDiscounts(surcharged, input.discounts, input.driver);
  return Math.max(MIN_PREMIUM_CENTS, discounted);
}
EOF

git add -A
at "2026-08-03T09:15:00-04:00"
git commit -q -m "feat(pricing): split premium rating into base, surcharge, and discount steps"

git checkout -q -b feat/pricing-engine-v2
git rm -q src/pricing/baseRate.ts src/pricing/surcharges.ts src/pricing/discounts.ts
mv "$stash/engine.ts" src/pricing/engine.ts
rmdir "$stash"
git add -A
at "2026-10-05T14:20:00-04:00"
git commit -q -m "feat(pricing): pricing engine v2 with state rules in one pass"
