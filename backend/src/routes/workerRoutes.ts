import { Router } from 'express';
import {
  listWorkerProjectsController,
  listWorkerTasksController,
  workerUpdateTaskController
} from '../controllers/projectController.js';
import { authenticate, requireRole } from '../middleware/authenticate.js';

export const workerRouter = Router();

workerRouter.use(authenticate, requireRole(['WORKER']));
workerRouter.get('/projects', listWorkerProjectsController);
workerRouter.get('/tasks', listWorkerTasksController);
workerRouter.patch('/tasks/:id', workerUpdateTaskController);
