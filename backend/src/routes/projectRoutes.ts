import { Router } from 'express';
import {
  addProjectMemberController,
  adminUpdateTaskController,
  createProjectController,
  createTaskController,
  getProjectWorkspaceController,
  listAdminProjectsController,
  listAdminTasksController,
  listFileVersionsController,
  listProjectMessagesController,
  restoreFileVersionController,
  saveProjectFileController,
  sendProjectMessageController
} from '../controllers/projectController.js';
import { authenticate, requireRole } from '../middleware/authenticate.js';

export const projectRouter = Router();

projectRouter.use(authenticate);
projectRouter.get('/:id/workspace', getProjectWorkspaceController);
projectRouter.get('/:id/messages', listProjectMessagesController);
projectRouter.post('/:id/messages', sendProjectMessageController);
projectRouter.patch('/files/:id', saveProjectFileController);
projectRouter.get('/files/:id/versions', listFileVersionsController);
projectRouter.post('/files/:id/restore', restoreFileVersionController);

projectRouter.use(requireRole(['ADMIN']));
projectRouter.get('/', listAdminProjectsController);
projectRouter.get('/tasks', listAdminTasksController);
projectRouter.post('/', createProjectController);
projectRouter.post('/:id/members', addProjectMemberController);
projectRouter.post('/:id/tasks', createTaskController);
projectRouter.patch('/tasks/:id', adminUpdateTaskController);
