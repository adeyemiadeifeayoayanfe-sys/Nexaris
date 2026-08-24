import { Router } from 'express';
import {
  createJobApplicationController,
  createProjectRequestController,
  getCareerController,
  listCareersController,
  listServicesController,
  publicConfigController
} from '../controllers/publicController.js';
import type { HttpRequest, HttpResponse } from '../types/http.js';

export const publicRouter = Router();

publicRouter.get('/config', publicConfigController);
publicRouter.get('/services', listServicesController);
publicRouter.get('/careers', listCareersController);
publicRouter.get('/careers/:slug', getCareerController);
publicRouter.get('/projects', (_request: HttpRequest, response: HttpResponse) => {
  response.json({
    projects: [],
    message: 'No public case studies have been published yet.'
  });
});
publicRouter.post('/project-requests', createProjectRequestController);
publicRouter.post('/job-applications', createJobApplicationController);
