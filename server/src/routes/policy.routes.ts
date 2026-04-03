import { Router } from 'express';
import { policyController } from '../controllers/policy.controller.js';
import { authMiddleware } from '../middleware/auth.js';

export const policyRoutes = Router();

policyRoutes.use(authMiddleware);

policyRoutes.post('/create', policyController.createPolicy);
policyRoutes.get('/active', policyController.getActivePolicy);
policyRoutes.post('/renew', policyController.renewPolicy);
policyRoutes.get('/:policyId/claims', policyController.getPolicyClaims);
policyRoutes.get('/:policyId/stats', policyController.getPolicyStats);
