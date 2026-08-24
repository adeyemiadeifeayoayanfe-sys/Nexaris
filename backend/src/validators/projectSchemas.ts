import { z } from 'zod';

export const projectStatusSchema = z.enum([
  'DRAFT',
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'IN_REVIEW',
  'COMPLETED',
  'ARCHIVED',
  'CANCELLED'
]);

export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const taskStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'REJECTED']);

export const projectRoleSchema = z.enum([
  'HTML DEVELOPER',
  'CSS STYLIST',
  'JAVASCRIPT DEVELOPER',
  'FRONTEND DEVELOPER',
  'BACKEND SUPPORT',
  'FULL-STACK DEVELOPER',
  'TESTER'
]);

const technologiesSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}, z.array(z.string().trim().min(1).max(40)).max(20).default([]));

export const createProjectSchema = z.object({
  requestId: z.uuid().optional(),
  name: z.string().trim().min(3).max(180),
  clientName: z.string().trim().min(2).max(160),
  clientEmail: z.email().max(160).optional(),
  clientWhatsapp: z.string().trim().max(32).optional(),
  description: z.string().trim().min(10).max(4000),
  deadline: z.string().date().optional(),
  priority: taskPrioritySchema.default('MEDIUM'),
  technologies: technologiesSchema,
  notes: z.string().trim().max(3000).optional()
});

export const addProjectMemberSchema = z.object({
  workerId: z.uuid(),
  projectRole: projectRoleSchema,
  canView: z.boolean().default(true),
  canEdit: z.boolean().default(false)
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(3000).optional(),
  assignedWorkerId: z.uuid().optional(),
  priority: taskPrioritySchema.default('MEDIUM'),
  status: taskStatusSchema.default('NOT_STARTED'),
  deadline: z.string().datetime().or(z.string().date()).optional(),
  relatedFileIds: z.array(z.uuid()).default([])
});

export const adminUpdateTaskSchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assignedWorkerId: z.uuid().nullable().optional(),
  reviewFeedback: z.string().trim().max(2000).optional()
});

export const workerUpdateTaskSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW'])
});

export const saveProjectFileSchema = z.object({
  content: z.string().max(200_000),
  lockVersion: z.number().int().positive(),
  changeSummary: z.string().trim().max(240).optional()
});

export const restoreFileVersionSchema = z.object({
  versionId: z.uuid(),
  changeSummary: z.string().trim().max(240).optional()
});

export const sendProjectMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  parentMessageId: z.uuid().optional(),
  mentions: z.array(z.uuid()).max(20).default([])
});

export const markNotificationReadSchema = z.object({
  notificationIds: z.array(z.uuid()).max(100).optional()
});
