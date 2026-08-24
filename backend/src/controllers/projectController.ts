import { ZodError } from 'zod';
export {
  listProjectMessagesController,
  sendProjectMessageController
} from './communicationController.js';
import {
  addProjectMember,
  createProject,
  createTask,
  getProjectWorkspace,
  listFileVersions,
  listAdminProjects,
  listAdminTasks,
  listWorkerProjects,
  listWorkerTasks,
  restoreProjectFileVersion,
  saveProjectFile,
  updateTaskAsAdmin,
  updateTaskAsWorker
} from '../services/projectService.js';
import type { HttpRequest, HttpResponse } from '../types/http.js';
import { formatZodError } from '../utils/http.js';
import {
  addProjectMemberSchema,
  adminUpdateTaskSchema,
  createProjectSchema,
  createTaskSchema,
  restoreFileVersionSchema,
  saveProjectFileSchema,
  workerUpdateTaskSchema
} from '../validators/projectSchemas.js';

export async function listAdminProjectsController(_request: HttpRequest, response: HttpResponse) {
  return response.json({
    projects: await listAdminProjects()
  });
}

export async function listAdminTasksController(_request: HttpRequest, response: HttpResponse) {
  return response.json({
    tasks: await listAdminTasks()
  });
}

export async function createProjectController(request: HttpRequest, response: HttpResponse) {
  try {
    if (!request.auth) {
      return response.status(401).json({ error: 'Authentication required' });
    }

    const payload = createProjectSchema.parse(request.body);
    const project = await createProject({
      ...payload,
      actorId: request.auth.userId
    });

    return response.status(201).json({ project });
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

export async function getProjectWorkspaceController(request: HttpRequest, response: HttpResponse) {
  if (!request.params.id || !request.auth) {
    return response.status(400).json({ error: 'Project id and auth are required' });
  }

  return response.json(
    await getProjectWorkspace(request.params.id, {
      userId: request.auth.userId,
      role: request.auth.role
    })
  );
}

export async function addProjectMemberController(request: HttpRequest, response: HttpResponse) {
  try {
    if (!request.params.id || !request.auth) {
      return response.status(400).json({ error: 'Project id and admin auth are required' });
    }

    const payload = addProjectMemberSchema.parse(request.body);
    const member = await addProjectMember({
      projectId: request.params.id,
      workerId: payload.workerId,
      projectRole: payload.projectRole,
      canView: payload.canView,
      canEdit: payload.canEdit,
      actorId: request.auth.userId
    });

    return response.status(201).json({ member });
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

export async function createTaskController(request: HttpRequest, response: HttpResponse) {
  try {
    if (!request.params.id || !request.auth) {
      return response.status(400).json({ error: 'Project id and admin auth are required' });
    }

    const payload = createTaskSchema.parse(request.body);
    const task = await createTask({
      projectId: request.params.id,
      title: payload.title,
      description: payload.description,
      assignedWorkerId: payload.assignedWorkerId,
      priority: payload.priority,
      status: payload.status,
      deadline: payload.deadline,
      relatedFileIds: payload.relatedFileIds,
      actorId: request.auth.userId
    });

    return response.status(201).json({ task });
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

export async function adminUpdateTaskController(request: HttpRequest, response: HttpResponse) {
  try {
    if (!request.params.id || !request.auth) {
      return response.status(400).json({ error: 'Task id and admin auth are required' });
    }

    const payload = adminUpdateTaskSchema.parse(request.body);
    const task = await updateTaskAsAdmin({
      taskId: request.params.id,
      actorId: request.auth.userId,
      status: payload.status,
      priority: payload.priority,
      assignedWorkerId: payload.assignedWorkerId,
      reviewFeedback: payload.reviewFeedback
    });

    return response.json({ task });
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

export async function listWorkerProjectsController(request: HttpRequest, response: HttpResponse) {
  if (!request.auth) {
    return response.status(401).json({ error: 'Authentication required' });
  }

  return response.json({
    projects: await listWorkerProjects(request.auth.userId)
  });
}

export async function listWorkerTasksController(request: HttpRequest, response: HttpResponse) {
  if (!request.auth) {
    return response.status(401).json({ error: 'Authentication required' });
  }

  return response.json({
    tasks: await listWorkerTasks(request.auth.userId)
  });
}

export async function workerUpdateTaskController(request: HttpRequest, response: HttpResponse) {
  try {
    if (!request.params.id || !request.auth) {
      return response.status(400).json({ error: 'Task id and worker auth are required' });
    }

    const payload = workerUpdateTaskSchema.parse(request.body);
    const task = await updateTaskAsWorker(request.params.id, request.auth.userId, payload.status);

    return response.json({ task });
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

export async function saveProjectFileController(request: HttpRequest, response: HttpResponse) {
  try {
    if (!request.params.id || !request.auth) {
      return response.status(400).json({ error: 'File id and auth are required' });
    }

    const payload = saveProjectFileSchema.parse(request.body);
    const file = await saveProjectFile({
      fileId: request.params.id,
      content: payload.content,
      lockVersion: payload.lockVersion,
      changeSummary: payload.changeSummary,
      viewer: {
        userId: request.auth.userId,
        role: request.auth.role
      }
    });

    return response.json({ file });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({
        error: 'Validation failed',
        fields: formatZodError(error)
      });
    }

    if (error instanceof Error && error.name === 'STALE_FILE_VERSION') {
      return response.status(409).json({ error: error.message });
    }

    throw error;
  }
}

export async function listFileVersionsController(request: HttpRequest, response: HttpResponse) {
  if (!request.params.id || !request.auth) {
    return response.status(400).json({ error: 'File id and auth are required' });
  }

  return response.json({
    versions: await listFileVersions(request.params.id, {
      userId: request.auth.userId,
      role: request.auth.role
    })
  });
}

export async function restoreFileVersionController(request: HttpRequest, response: HttpResponse) {
  try {
    if (!request.params.id || !request.auth) {
      return response.status(400).json({ error: 'File id and auth are required' });
    }

    const payload = restoreFileVersionSchema.parse(request.body);
    const file = await restoreProjectFileVersion({
      fileId: request.params.id,
      versionId: payload.versionId,
      changeSummary: payload.changeSummary,
      viewer: {
        userId: request.auth.userId,
        role: request.auth.role
      }
    });

    return response.json({ file });
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
