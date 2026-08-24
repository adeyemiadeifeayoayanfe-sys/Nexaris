import { Router } from 'express';
import {
  listNotificationsController,
  markNotificationsReadController
} from '../controllers/communicationController.js';
import { authenticate } from '../middleware/authenticate.js';

export const communicationRouter = Router();

communicationRouter.use(authenticate);
communicationRouter.get('/notifications', listNotificationsController);
communicationRouter.patch('/notifications/read', markNotificationsReadController);
