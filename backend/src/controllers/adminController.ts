import { ZodError } from 'zod';
import type { HttpRequest, HttpResponse } from '../types/http.js';
import {
  approveApplication,
  createAdminAccount,
  getAdminDashboard,
  listAdmins,
  listJobApplications,
  listProjectRequests,
  listWorkers,
  resendApplicationInvitation,
  updateApplicationStatus,
  updateProjectRequestStatus,
  updateWorkerStatus
} from '../services/adminService.js';
import { env } from '../config/env.js';
import { formatZodError } from '../utils/http.js';
import {
  approveApplicationSchema,
  applicationStatusSchema,
  createAdminSchema,
  requestStatusSchema,
  updateApplicationStatusSchema,
  updateRequestStatusSchema,
  updateWorkerStatusSchema,
  workerStatusSchema
} from '../validators/adminSchemas.js';

function isOwnerAdmin(request: HttpRequest) {
  return request.auth?.email?.toLowerCase() === env.OWNER_ADMIN_EMAIL.toLowerCase();
}

export async function adminDashboardController(request: HttpRequest, response: HttpResponse) {
  return response.json({
    ...(await getAdminDashboard()),
    capabilities: {
      canManageAdmins: isOwnerAdmin(request)
    }
  });
}

export async function listAdminsController(request: HttpRequest, response: HttpResponse) {
  if (!isOwnerAdmin(request)) {
    return response.status(403).json({
      error: 'Only the owner admin can manage admin accounts'
    });
  }

  return response.json({
    admins: await listAdmins()
  });
}

export async function createAdminController(request: HttpRequest, response: HttpResponse) {
  try {
    if (!isOwnerAdmin(request) || !request.auth) {
      return response.status(403).json({
        error: 'Only the owner admin can create admin accounts'
      });
    }

    const payload = createAdminSchema.parse(request.body);
    const created = await createAdminAccount({
      actorId: request.auth.userId,
      email: payload.email,
      fullName: payload.fullName,
      sendInvite: payload.sendInvite
    });

    return response.status(201).json(created);
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

export async function listProjectRequestsController(request: HttpRequest, response: HttpResponse) {
  const status = typeof request.query.status === 'string' ? request.query.status : undefined;
  const search = typeof request.query.search === 'string' ? request.query.search : undefined;

  return response.json({
    requests: await listProjectRequests({
      status: status ? requestStatusSchema.parse(status) : undefined,
      search
    })
  });
}

export async function updateProjectRequestStatusController(request: HttpRequest, response: HttpResponse) {
  try {
    const payload = updateRequestStatusSchema.parse(request.body);

    if (!request.params.id || !request.auth) {
      return response.status(400).json({
        error: 'Request id and admin auth are required'
      });
    }

    const updated = await updateProjectRequestStatus({
      requestId: request.params.id,
      status: payload.status,
      actorId: request.auth.userId
    });

    return response.json({ request: updated });
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

export async function listJobApplicationsController(request: HttpRequest, response: HttpResponse) {
  const status = typeof request.query.status === 'string' ? request.query.status : undefined;
  const search = typeof request.query.search === 'string' ? request.query.search : undefined;

  return response.json({
    applications: await listJobApplications({
      status: status ? applicationStatusSchema.parse(status) : undefined,
      search
    })
  });
}

export async function updateJobApplicationStatusController(request: HttpRequest, response: HttpResponse) {
  try {
    const payload = updateApplicationStatusSchema.parse(request.body);

    if (!request.params.id || !request.auth) {
      return response.status(400).json({
        error: 'Application id and admin auth are required'
      });
    }

    const updated = await updateApplicationStatus({
      applicationId: request.params.id,
      status: payload.status,
      actorId: request.auth.userId
    });

    return response.json({ application: updated });
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

export async function approveApplicationController(request: HttpRequest, response: HttpResponse) {
  try {
    const payload = approveApplicationSchema.parse(request.body);

    if (!request.params.id || !request.auth) {
      return response.status(400).json({
        error: 'Application id and admin auth are required'
      });
    }

    const approved = await approveApplication({
      applicationId: request.params.id,
      actorId: request.auth.userId,
      sendInvite: payload.sendInvite
    });

    return response.json(approved);
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

export async function resendApplicationInvitationController(request: HttpRequest, response: HttpResponse) {
  if (!request.params.id || !request.auth) {
    return response.status(400).json({
      error: 'Application id and admin auth are required'
    });
  }

  return response.json(
    await resendApplicationInvitation({
      applicationId: request.params.id,
      actorId: request.auth.userId
    })
  );
}

export async function listWorkersController(request: HttpRequest, response: HttpResponse) {
  const status = typeof request.query.status === 'string' ? request.query.status : undefined;
  const search = typeof request.query.search === 'string' ? request.query.search : undefined;

  return response.json({
    workers: await listWorkers({
      status: status ? workerStatusSchema.parse(status) : undefined,
      search
    })
  });
}

export async function updateWorkerStatusController(request: HttpRequest, response: HttpResponse) {
  try {
    const payload = updateWorkerStatusSchema.parse(request.body);

    if (!request.params.id || !request.auth) {
      return response.status(400).json({
        error: 'Worker id and admin auth are required'
      });
    }

    const updated = await updateWorkerStatus({
      workerId: request.params.id,
      status: payload.status,
      actorId: request.auth.userId
    });

    return response.json({ worker: updated });
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
