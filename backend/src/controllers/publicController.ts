import { ZodError } from 'zod';
import {
  createJobApplication,
  createProjectRequest,
  getCareerOpening,
  getPublicConfig,
  listCareerOpenings,
  listServices
} from '../services/publicService.js';
import type { HttpRequest, HttpResponse } from '../types/http.js';
import { formatZodError } from '../utils/http.js';
import { jobApplicationSchema, projectRequestSchema } from '../validators/publicSchemas.js';

export async function publicConfigController(_request: HttpRequest, response: HttpResponse) {
  return response.json(await getPublicConfig());
}

export async function listServicesController(_request: HttpRequest, response: HttpResponse) {
  return response.json({ services: await listServices() });
}

export async function listCareersController(_request: HttpRequest, response: HttpResponse) {
  return response.json({ openings: await listCareerOpenings() });
}

export async function getCareerController(request: HttpRequest, response: HttpResponse) {
  const slug = request.params.slug;

  if (!slug) {
    return response.status(400).json({
      error: 'Career slug is required'
    });
  }

  const opening = await getCareerOpening(slug);

  if (!opening) {
    return response.status(404).json({
      error: 'Career opening not found'
    });
  }

  return response.json({ opening });
}

export async function createProjectRequestController(request: HttpRequest, response: HttpResponse) {
  try {
    const payload = projectRequestSchema.parse(request.body);
    const result = await createProjectRequest(payload);

    if (result.kind === 'duplicate') {
      return response.status(409).json({
        error: 'A similar project request was submitted recently.',
        code: result.code
      });
    }

    return response.status(201).json({
      requestId: result.id,
      requestCode: result.code,
      whatsappUrl: result.whatsappUrl,
      whatsappConfigured: result.whatsappConfigured,
      message:
        'Project request saved as PENDING. Continue to WhatsApp to send the pre-filled message manually.'
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        error: 'Validation failed',
        fields: formatZodError(error)
      });
    }

    throw error;
  }
}

export async function createJobApplicationController(request: HttpRequest, response: HttpResponse) {
  try {
    const payload = jobApplicationSchema.parse(request.body);
    const result = await createJobApplication(payload);

    if (result.kind === 'duplicate') {
      return response.status(409).json({
        error: 'A similar application was submitted recently.',
        code: result.code
      });
    }

    return response.status(201).json({
      applicationId: result.id,
      applicationCode: result.code,
      whatsappUrl: result.whatsappUrl,
      whatsappConfigured: result.whatsappConfigured,
      message:
        'Job application saved as PENDING. Continue to WhatsApp to send the pre-filled message manually.'
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        error: 'Validation failed',
        fields: formatZodError(error)
      });
    }

    throw error;
  }
}
