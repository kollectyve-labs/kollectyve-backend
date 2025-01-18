export interface User {
  id: string;
  email: string;
  password: string;
  salt: string;
  role: "provider" | "developer" | "relai";
  metadata?: Record<string, any>; // Additional metadata
}

export interface Provider {
  address: string;
  name: string;
  website?: string;
  email?: string;
  total_resources: 0;
  reputation_score?: number;
  registration_block?: number;
  last_updated?: number;
  status: "active" | "inactive" | "suspended" | "terminated";
}

export interface HealthStat {
  address: string;
  message: string;
  signature: string;
  verified_at?: string;
}
