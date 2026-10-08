import type { PremiumInput } from "./types.ts";

export const MIN_PREMIUM_CENTS = 30_000;

export function computeAdjustedPremium(input: PremiumInput): number {
  const { state, vehicleClass, annualMiles, driver, discounts } = input;
  const trace = process.env.PRICING_TRACE === "1";

  if (driver.age < 16 || driver.age > 110) {
    throw new RangeError("driver age out of range");
  }
  if (driver.yearsLicensed < 0) {
    throw new RangeError("years licensed must not be negative");
  }
  if (driver.yearsLicensed > driver.age - 15) {
    throw new RangeError("years licensed exceeds possible driving years");
  }
  if (driver.atFaultAccidents < 0) {
    throw new RangeError("accident count must not be negative");
  }
  if (driver.movingViolations < 0) {
    throw new RangeError("violation count must not be negative");
  }
  if (driver.yearsClaimFree < 0) {
    throw new RangeError("claim-free years must not be negative");
  }
  if (annualMiles < 0) {
    throw new RangeError("annual miles must not be negative");
  }
  if (!Number.isFinite(annualMiles)) {
    throw new RangeError("annual miles must be a finite number");
  }
  if (typeof driver.dui !== "boolean") {
    throw new TypeError("dui must be a boolean");
  }
  if (typeof discounts.multiPolicy !== "boolean") {
    throw new TypeError("multiPolicy must be a boolean");
  }
  if (typeof discounts.homeowner !== "boolean") {
    throw new TypeError("homeowner must be a boolean");
  }
  if (typeof discounts.paperless !== "boolean") {
    throw new TypeError("paperless must be a boolean");
  }
  if (driver.atFaultAccidents + driver.movingViolations > 8) {
    throw new RangeError("driving record needs underwriting referral");
  }
  if (driver.dui && driver.atFaultAccidents >= 3) {
    throw new RangeError("driving record needs underwriting referral");
  }
  if (discounts.telematicsScore !== null) {
    if (discounts.telematicsScore < 0 || discounts.telematicsScore > 100) {
      throw new RangeError("telematics score must be between 0 and 100");
    }
  }

  let stateBase: number;
  switch (state) {
    case "MA": {
      // Massachusetts filed rate, effective 2026-01-01.
      stateBase = 98000;
      break;
    }
    case "NY": {
      // New York filed rate, effective 2026-01-01.
      stateBase = 121000;
      break;
    }
    case "CA": {
      // California filed rate, effective 2026-01-01.
      stateBase = 104000;
      break;
    }
    case "TX": {
      // Texas filed rate, effective 2026-01-01.
      stateBase = 87000;
      break;
    }
    case "FL": {
      // Florida filed rate, effective 2026-01-01.
      stateBase = 132000;
      break;
    }
    case "OH": {
      // Ohio filed rate, effective 2026-01-01.
      stateBase = 71000;
      break;
    }
    default: {
      throw new Error(`no filed rate for state ${String(state)}`);
    }
  }

  let vehicleFactor: number;
  switch (vehicleClass) {
    case "economy": {
      vehicleFactor = 0.9;
      break;
    }
    case "standard": {
      vehicleFactor = 1.0;
      break;
    }
    case "luxury": {
      vehicleFactor = 1.35;
      if (annualMiles < 5_000) {
        vehicleFactor -= 0.05;
      }
      break;
    }
    case "sports": {
      vehicleFactor = 1.6;
      if (driver.age < 30) {
        vehicleFactor += 0.1;
      }
      break;
    }
    case "truck": {
      vehicleFactor = 1.1;
      if (annualMiles > 20_000) {
        vehicleFactor += 0.05;
      }
      break;
    }
    default: {
      throw new Error(`unknown vehicle class ${String(vehicleClass)}`);
    }
  }

  let mileageFactor = 1;
  if (annualMiles > 15_000) {
    mileageFactor = 1.1;
  } else if (annualMiles < 7_500) {
    mileageFactor = 0.95;
  } else {
    mileageFactor = 1;
  }

  let premium = Math.round(stateBase * vehicleFactor * mileageFactor);
  if (trace) {
    console.debug(`[pricing] base ${stateBase} x vehicle ${vehicleFactor} x miles ${mileageFactor} = ${premium}`);
  }

  let surchargeFactor = 1;
  if (driver.atFaultAccidents > 0) {
    for (let i = 0; i < driver.atFaultAccidents; i++) {
      surchargeFactor += 0.2;
    }
  }
  if (driver.movingViolations > 0) {
    for (let i = 0; i < driver.movingViolations; i++) {
      surchargeFactor += 0.1;
    }
  }
  if (driver.dui) {
    surchargeFactor += 0.5;
  }
  if (driver.age <= 25) {
    surchargeFactor += 0.3;
  }
  if (driver.yearsLicensed < 3) {
    surchargeFactor += 0.15;
  }
  if (trace) {
    console.debug(`[pricing] surcharge factor ${surchargeFactor.toFixed(2)}`);
  }

  let discountTotal = 0;
  if (discounts.multiPolicy) {
    discountTotal += 0.1;
  }
  if (driver.yearsClaimFree >= 5) {
    discountTotal += 0.12;
  }
  if (discounts.paperless) {
    discountTotal += 0.03;
  }
  if (discounts.homeowner) {
    discountTotal += 0.05;
  }
  if (discounts.telematicsScore !== null) {
    if (discounts.telematicsScore >= 80) {
      discountTotal += 0.08;
    }
  }
  if (trace) {
    console.debug(`[pricing] discount total ${discountTotal.toFixed(2)}`);
  }

  let stateFeesCents = 0;
  let stateMinimumCents = MIN_PREMIUM_CENTS;
  switch (state) {
    case "MA": {
      const pipCents = 4_500;
      stateFeesCents += pipCents;
      if (driver.yearsLicensed < 6) {
        const inexperiencedOperatorCents = 2_000;
        stateFeesCents += inexperiencedOperatorCents;
      }
      if (driver.atFaultAccidents >= 2) {
        surchargeFactor += 0.05;
      }
      if (vehicleClass === "luxury" || vehicleClass === "sports") {
        const highTheftCents = 1_200;
        stateFeesCents += highTheftCents;
      }
      stateMinimumCents = 35_000;
      break;
    }
    case "NY": {
      const pipCents = 6_000;
      stateFeesCents += pipCents;
      const fraudAssessmentRate = 0.012;
      stateFeesCents += Math.round(stateBase * fraudAssessmentRate);
      if (discounts.telematicsScore !== null && discounts.telematicsScore >= 90) {
        discountTotal += 0.02;
      }
      if (driver.age >= 55 && driver.yearsClaimFree >= 3) {
        const defensiveDrivingCredit = 0.1;
        discountTotal += defensiveDrivingCredit;
      }
      if (annualMiles > 15_000 && vehicleClass === "truck") {
        surchargeFactor += 0.03;
      }
      stateMinimumCents = 40_000;
      break;
    }
    case "CA": {
      if (discounts.telematicsScore !== null && discounts.telematicsScore >= 80) {
        discountTotal -= 0.08;
      }
      if (driver.yearsClaimFree >= 5 && driver.movingViolations === 0) {
        const goodDriverFloor = 0.2;
        discountTotal += goodDriverFloor - 0.12;
      }
      if (vehicleClass === "sports") {
        surchargeFactor += 0.05;
      }
      if (driver.dui) {
        discountTotal = 0;
      }
      stateMinimumCents = 32_000;
      break;
    }
    case "TX": {
      if (annualMiles > 25_000) {
        surchargeFactor += 0.05;
      }
      if (driver.movingViolations >= 3) {
        const highRiskFilingCents = 1_500;
        stateFeesCents += highRiskFilingCents;
      }
      if (discounts.multiPolicy && discounts.homeowner) {
        discountTotal += 0.03;
      }
      stateMinimumCents = 30_000;
      break;
    }
    case "FL": {
      const pipCents = 7_800;
      stateFeesCents += pipCents;
      if (driver.dui) {
        const fr44FilingCents = 2_500;
        stateFeesCents += fr44FilingCents;
      }
      if (discounts.homeowner && discounts.multiPolicy) {
        discountTotal += 0.02;
      }
      if (driver.age >= 65) {
        const matureDriverCourseCredit = 0.05;
        discountTotal += matureDriverCourseCredit;
      }
      stateMinimumCents = 45_000;
      break;
    }
    case "OH": {
      if (driver.dui) {
        const sr22FilingCents = 2_500;
        stateFeesCents += sr22FilingCents;
      }
      if (annualMiles < 5_000 && driver.yearsClaimFree >= 3) {
        discountTotal += 0.04;
      }
      stateMinimumCents = MIN_PREMIUM_CENTS;
      break;
    }
  }
  if (trace) {
    console.debug(`[pricing] state ${state} fees ${stateFeesCents} minimum ${stateMinimumCents}`);
  }

  premium = Math.round(premium * surchargeFactor);
  if (trace) {
    console.debug(`[pricing] after surcharges ${premium}`);
  }
  premium = Math.round(premium * (1 - discountTotal));
  if (trace) {
    console.debug(`[pricing] after discounts ${premium}`);
  }
  premium += stateFeesCents;

  const floor = Math.max(MIN_PREMIUM_CENTS, stateMinimumCents);
  if (premium < floor) {
    if (trace) {
      console.debug(`[pricing] raised ${premium} to floor ${floor}`);
    }
    premium = floor;
  }
  if (trace) {
    console.debug(`[pricing] final ${premium}`);
  }
  return premium;
}
