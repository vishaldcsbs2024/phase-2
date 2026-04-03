import { Router } from 'express';
import { claimController } from '../controllers/claim.controller.js';
import { authMiddleware } from '../middleware/auth.js';

export const claimRoutes = Router();

claimRoutes.post('/create', authMiddleware, claimController.createClaim);
claimRoutes.get('/my-claims', authMiddleware, claimController.getPartnerClaims);
claimRoutes.post('/:claimId/approve', claimController.approveClaim);
claimRoutes.post('/report-disruption', claimController.reportDisruption);
