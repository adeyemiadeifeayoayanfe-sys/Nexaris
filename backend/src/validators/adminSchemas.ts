import { z } from 'zod';

export const requestStatusSchema = z.enum([
  'PENDING',
  'REVIEWING',
  'ACCEPTED',
  'DECLINED',
  'ARCHIVED'
]);

export const applicationStatusSchema = z.enum([
  'PENDING',
  'REVIEWING',
  'APPROVED',
  'REJECTED',
  'ARCHIVED'
]);

export const workerStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']);

export const updateRequestStatusSchema = z.object({
  status: requestStatusSchema
});

export const updateApplicationStatusSchema = z.object({
  status: applicationStatusSchema
});

export const approveApplicationSchema = z.object({
  sendInvite: z.boolean().default(true)
});

export const updateWorkerStatusSchema = z.object({
  status: workerStatusSchema
});

export const createAdminSchema = z.object({
  email: z.email('Enter a valid admin email address').max(160),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  sendInvite: z.boolean().default(true)
});
