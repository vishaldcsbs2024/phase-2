import { partnerModel } from '../models/Partner.js';
import { policyModel } from '../models/Policy.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';

export const authService = {
  async register(phoneNumber: string, fullName: string, password: string) {
    const existing = await partnerModel.findByPhone(phoneNumber);
    if (existing) {
      throw new Error('Phone number already registered');
    }

    const passwordHash = await hashPassword(password);
    const partner = await partnerModel.create({
      phone_number: phoneNumber,
      password_hash: passwordHash,
      full_name: fullName,
      platforms: ['zomato'],
      kyc_verified: false,
    });

    const token = generateToken(partner.id);
    return { partner: { id: partner.id, phone_number: partner.phone_number, full_name: partner.full_name }, token };
  },

  async login(phoneNumber: string, password: string) {
    const partner = await partnerModel.findByPhone(phoneNumber);
    if (!partner) {
      throw new Error('Invalid credentials');
    }

    const isValid = await comparePassword(password, partner.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken(partner.id);
    return { partner: { id: partner.id, phone_number: partner.phone_number, full_name: partner.full_name }, token };
  },

  async getProfile(partnerId: string) {
    const profile = await partnerModel.getProfileWithPolicies(partnerId);
    if (!profile) {
      throw new Error('Partner not found');
    }
    return profile;
  },

  async updateProfile(partnerId: string, data: any) {
    const updated = await partnerModel.update(partnerId, data);
    if (!updated) {
      throw new Error('Partner not found');
    }
    return updated;
  },
};
