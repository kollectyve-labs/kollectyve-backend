// deno-lint-ignore-file no-explicit-any
// Type definitions for better type safety
export interface UserData {
  userId: string;
  roles: string[];
  walletAddress?: string;
  wallets?: string[];
  providerData?: ProviderData;
  metadata?: Record<string, any>; // Additional metadata
}

export interface ProviderData {
  name?: string;
  website?: string;
  total_resources: 0;
  reputation_score?: number;
  registration_block?: number;
  last_updated?: number;
  status?: "inactive" | "active" | "suspended" | "terminated";
  ipAddress: string;
}

export interface HealthStat {
  address: string;
  message: string;
  signature: string;
  verified_at?: string;
}

export interface AppConfig {
  id: string;
  name: string;
  allowedOrigins: string[];
}
