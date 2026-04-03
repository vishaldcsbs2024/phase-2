-- GigShield Backend - Database Schema
-- Create these tables in PostgreSQL

-- Partners table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY,
  phone VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  kyc_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id),
  platform VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  weekly_premium DECIMAL(10, 2) NOT NULL,
  coverage_amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id),
  policy_id UUID NOT NULL REFERENCES policies(id),
  reason VARCHAR(50) NOT NULL,
  location VARCHAR(100) NOT NULL,
  lost_hours INTEGER DEFAULT 0,
  daily_income DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'submitted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disruptions table
CREATE TABLE IF NOT EXISTS disruptions (
  id UUID PRIMARY KEY,
  location VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  severity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id),
  claim_id UUID NOT NULL REFERENCES claims(id),
  amount DECIMAL(10, 2) NOT NULL,
  utr VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partners_phone ON partners(phone);
CREATE INDEX IF NOT EXISTS idx_policies_partner_id ON policies(partner_id);
CREATE INDEX IF NOT EXISTS idx_claims_partner_id ON claims(partner_id);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_disruptions_location ON disruptions(location);
CREATE INDEX IF NOT EXISTS idx_payouts_partner_id ON payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_claim_id ON payouts(claim_id);
