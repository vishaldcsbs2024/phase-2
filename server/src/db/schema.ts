import { query } from './index.js';

export const initializeSchema = async () => {
  try {
    // Partners table
    await query(`
      CREATE TABLE IF NOT EXISTS partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number VARCHAR(15) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        platforms TEXT[] DEFAULT ARRAY['zomato'],
        kyc_verified BOOLEAN DEFAULT FALSE,
        bank_account VARCHAR(255),
        ifsc_code VARCHAR(11),
        upi_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Policies table
    await query(`
      CREATE TABLE IF NOT EXISTS policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        premium_weekly DECIMAL(10, 2) NOT NULL,
        coverage_amount DECIMAL(15, 2) NOT NULL,
        disrupted_days INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        active_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Claims table
    await query(`
      CREATE TABLE IF NOT EXISTS claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        claim_date DATE NOT NULL,
        disruption_type VARCHAR(50) NOT NULL,
        location VARCHAR(255),
        daily_payout DECIMAL(15, 2),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Disruptions table
    await query(`
      CREATE TABLE IF NOT EXISTS disruptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        disruption_type VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        severity_level INT DEFAULT 1,
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payments table (premium payments)
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) DEFAULT 'pending',
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payouts table
    await query(`
      CREATE TABLE IF NOT EXISTS payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        payout_amount DECIMAL(15, 2) NOT NULL,
        payout_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        bank_reference VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_partners_phone ON partners(phone_number)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_policies_partner ON policies(partner_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_claims_policy ON claims(policy_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_claims_partner ON claims(partner_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_disruptions_location ON disruptions(location)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_partner ON payments(partner_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payouts_partner ON payouts(partner_id)`);

    console.log('✓ Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw error;
  }
};
