export type LoyaltyTier = 'gold' | 'silver' | 'bronze' | 'none';

export interface User {
  id: string;
  tier: LoyaltyTier;
}

export interface Order {
  id: string;
  subtotal: number;
}
