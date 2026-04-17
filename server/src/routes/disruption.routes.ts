import { Router } from 'express';
import { disruptionController } from '../controllers/disruption.controller.js';

export const disruptionRoutes = Router();

disruptionRoutes.post('/simulate', disruptionController.simulateDisruption);
disruptionRoutes.post('/record', disruptionController.recordDisruption);
disruptionRoutes.get('/active', disruptionController.getActiveDisruptions);
disruptionRoutes.post('/:disruptionId/resolve', disruptionController.resolveDisruption);
