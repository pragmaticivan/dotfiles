export type StateCode = "MA" | "NY" | "CA" | "TX" | "FL" | "OH";
export type VehicleClass = "economy" | "standard" | "luxury" | "sports" | "truck";

export interface DriverProfile {
  age: number;
  yearsLicensed: number;
  atFaultAccidents: number;
  movingViolations: number;
  dui: boolean;
  yearsClaimFree: number;
}

export interface DiscountProfile {
  multiPolicy: boolean;
  homeowner: boolean;
  paperless: boolean;
  telematicsScore: number | null;
}

export interface PremiumInput {
  state: StateCode;
  vehicleClass: VehicleClass;
  annualMiles: number;
  driver: DriverProfile;
  discounts: DiscountProfile;
}
