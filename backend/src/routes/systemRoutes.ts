import { Router } from 'express';
import { systemStatusController } from '../controllers/systemController.js';

export const systemRouter = Router();

systemRouter.get('/status', systemStatusController);
