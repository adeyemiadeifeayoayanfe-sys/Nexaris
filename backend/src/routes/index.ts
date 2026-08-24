import { Router } from 'express';
import { adminRouter } from './adminRoutes.js';
import { authRouter } from './authRoutes.js';
import { communicationRouter } from './communicationRoutes.js';
import { healthController } from '../controllers/healthController.js';
import { publicRouter } from './publicRoutes.js';
import { projectRouter } from './projectRoutes.js';
import { systemRouter } from './systemRoutes.js';
import { workerRouter } from './workerRoutes.js';

export const apiRouter = Router();

apiRouter.get('/health', healthController);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/public', publicRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/system', systemRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/communication', communicationRouter);
apiRouter.use('/worker', workerRouter);
