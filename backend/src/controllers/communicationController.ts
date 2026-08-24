import { ZodError } from 'zod';
import {
  listNotifications,
  listProjectMessages,
  markNotificationsRead,
  sendProjectMessage
} from '../services/communicationService.js';
import type { HttpRequest, HttpResponse } from '../types/http.js';
import { formatZodError } from '../utils/http.js';
import { markNotificationReadSchema, sendProjectMessageSchema } from '../validators/projectSchemas.js';

export async function listNotificationsController(request: HttpRequest, response: HttpResponse) {
  if (!request.auth) {
    return response.status(401).json({ error: 'Authentication required' });
  }

  return response.json({
    notifications: await listNotifications(request.auth.userId)
  });
}

export async function markNotificationsReadController(request: HttpRequest, response: HttpResponse) {
  try {
    if (!request.auth) {
      return response.status(401).json({ error: 'Authentication required' });
    }

    const payload = markNotificationReadSchema.parse(request.body);

    return response.json({
      notifications: await markNotificationsRead(request.auth.userId, payload.notificationIds)
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({ error: 'Validation failed', fields: formatZodError(error) });
    }

    throw error;
  }
}

export async function listProjectMessagesController(request: HttpRequest, response: HttpResponse) {
  if (!request.params.id || !request.auth) {
    return response.status(400).json({ error: 'Project id and auth are required' });
  }

  return response.json({
    messages: await listProjectMessages(request.params.id, {
      userId: request.auth.userId,
      role: request.auth.role
    })
  });
}

export async function sendProjectMessageController(request: HttpRequest, response: HttpResponse) {
  try {
    if (!request.params.id || !request.auth) {
      return response.status(400).json({ error: 'Project id and auth are required' });
    }

    const payload = sendProjectMessageSchema.parse(request.body);

    return response.status(201).json({
      message: await sendProjectMessage({
        projectId: request.params.id,
        body: payload.body,
        parentMessageId: payload.parentMessageId,
        mentions: payload.mentions,
        viewer: {
          userId: request.auth.userId,
          role: request.auth.role
        }
      })
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(400).json({ error: 'Validation failed', fields: formatZodError(error) });
    }

    throw error;
  }
}
