import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { phoneNumber, fullName, password } = req.body;

      if (!phoneNumber || !fullName || !password) {
        return res.status(400).json(errorResponse('Missing required fields'));
      }

      const result = await authService.register(phoneNumber, fullName, password);
      res.status(201).json(successResponse(result, 'Registration successful'));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { phoneNumber, password } = req.body;

      if (!phoneNumber || !password) {
        return res.status(400).json(errorResponse('Phone number and password required'));
      }

      const result = await authService.login(phoneNumber, password);
      res.json(successResponse(result, 'Login successful'));
    } catch (error: any) {
      res.status(401).json(errorResponse(error.message));
    }
  },

  async getProfile(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const profile = await authService.getProfile(partnerId);
      res.json(successResponse(profile));
    } catch (error: any) {
      res.status(404).json(errorResponse(error.message));
    }
  },

  async updateProfile(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const { fullName, email, bankAccount, ifscCode, upiId, platforms } = req.body;
      const updateData = {
        ...(fullName && { full_name: fullName }),
        ...(email && { email }),
        ...(bankAccount && { bank_account: bankAccount }),
        ...(ifscCode && { ifsc_code: ifscCode }),
        ...(upiId && { upi_id: upiId }),
        ...(platforms && { platforms }),
      };

      const updated = await authService.updateProfile(partnerId, updateData);
      res.json(successResponse(updated, 'Profile updated'));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },
};
