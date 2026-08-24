import { Router } from 'express';
import { authSessionController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';

export const authRouter = Router();

authRouter.get('/me', authenticate, authSessionController);
