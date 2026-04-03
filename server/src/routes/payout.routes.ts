import { Router } from 'express';
import { payoutController } from '../controllers/payout.controller.js';
import { authMiddleware } from '../middleware/auth.js';

export const payoutRoutes = Router();

payoutRoutes.use(authMiddleware);

payoutRoutes.get('/my-payouts', payoutController.getPartnerPayouts);
payoutRoutes.get('/stats', payoutController.getPayoutStats);
payoutRoutes.get('/total', payoutController.getTotalPayouts);
