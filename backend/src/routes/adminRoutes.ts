import { Router } from 'express';
import {
  adminDashboardController,
  approveApplicationController,
  createAdminController,
  listAdminsController,
  listJobApplicationsController,
  listProjectRequestsController,
  listWorkersController,
  resendApplicationInvitationController,
  updateJobApplicationStatusController,
  updateProjectRequestStatusController,
  updateWorkerStatusController
} from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/authenticate.js';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole(['ADMIN']));
adminRouter.get('/dashboard', adminDashboardController);
adminRouter.get('/admins', listAdminsController);
adminRouter.post('/admins', createAdminController);
adminRouter.get('/project-requests', listProjectRequestsController);
adminRouter.patch('/project-requests/:id', updateProjectRequestStatusController);
adminRouter.get('/applications', listJobApplicationsController);
adminRouter.patch('/applications/:id', updateJobApplicationStatusController);
adminRouter.post('/applications/:id/approve', approveApplicationController);
adminRouter.post('/applications/:id/resend-invitation', resendApplicationInvitationController);
adminRouter.get('/workers', listWorkersController);
adminRouter.patch('/workers/:id', updateWorkerStatusController);
