export interface ProviderEntity {
  address: string;
  name: string;
  website?: string;
  total_resources: number;
  reputation_score: number;
  registration_block?: number;
  last_updated?: number;
  email: string;
  status: string;
}

export interface HealthStatEntity {
  address: string;
  message: string;
  signature: string;
  verified_at?: string;
}
