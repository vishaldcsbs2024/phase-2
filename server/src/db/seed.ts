import { config } from '../utils/config.js';
import { partnerModel } from '../models/Partner.js';
import { policyModel } from '../models/Policy.js';
import { hashPassword } from '../utils/auth.js';
import { query } from './index.js';

async function seedDatabase() {
  try {
    console.log('Starting database seed...');

    // Clear existing data (be careful with this!)
    // Uncomment only if you want to reset database
    // await query('TRUNCATE TABLE payouts, claims, disruptions, payments, policies, partners CASCADE');

    // Create test partners
    const testPartners = [
      {
        phone_number: '9876543210',
        full_name: 'Priya Sharma',
        email: 'priya@example.com',
        password: 'password123',
      },
      {
        phone_number: '9876543211',
        full_name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        password: 'password123',
      },
      {
        phone_number: '9876543212',
        full_name: 'Ananya Gupta',
        email: 'ananya@example.com',
        password: 'password123',
      },
    ];

    const partnerIds: string[] = [];

    for (const partner of testPartners) {
      try {
        const existing = await partnerModel.findByPhone(partner.phone_number);
        if (!existing) {
          const passwordHash = await hashPassword(partner.password);
          const created = await partnerModel.create({
            phone_number: partner.phone_number,
            password_hash: passwordHash,
            full_name: partner.full_name,
            email: partner.email,
            platforms: ['zomato', 'swiggy'],
            kyc_verified: false,
          });
          partnerIds.push(created.id);
          console.log(`✓ Created partner: ${partner.full_name} (${partner.phone_number})`);
        } else {
          partnerIds.push(existing.id);
          console.log(`✓ Partner already exists: ${partner.full_name}`);
        }
      } catch (error: any) {
        console.error(`✗ Error creating partner ${partner.full_name}:`, error.message);
      }
    }

    // Create test policies
    for (let i = 0; i < partnerIds.length; i++) {
      try {
        const existing = await policyModel.getActivePolicy(partnerIds[i]);
        if (!existing) {
          const policy = await policyModel.create({
            partner_id: partnerIds[i],
            premium_weekly: 50 + i * 10,
            coverage_amount: (50 + i * 10) * 500,
            status: 'active',
            active_from: new Date(),
          });
          console.log(`✓ Created policy for partner ${i + 1}: ₹${policy.premium_weekly}/week`);
        } else {
          console.log(`✓ Policy already exists for partner ${i + 1}`);
        }
      } catch (error: any) {
        console.error(`✗ Error creating policy:`, error.message);
      }
    }

    console.log('\n✓ Database seed completed successfully!');
    console.log('\nTest Credentials:');
    testPartners.forEach((p, i) => {
      console.log(`Partner ${i + 1}: ${p.phone_number} / ${p.password}`);
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
