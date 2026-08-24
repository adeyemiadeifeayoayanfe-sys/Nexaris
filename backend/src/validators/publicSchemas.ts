import { z } from 'zod';
import { careerOpenings } from '../content/publicContent.js';

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .transform((value) => (value ? value : undefined));

const urlField = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => !value || /^https?:\/\//.test(value), {
    message: 'Must be a valid http or https URL'
  });

export const projectRequestSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.email('Enter a valid email address').max(160),
  whatsappNumber: z
    .string()
    .trim()
    .min(7, 'WhatsApp number must include at least 7 digits')
    .max(32, 'WhatsApp number must be 32 characters or fewer')
    .refine((value) => /^[+\d\s().-]+$/.test(value), {
      message: 'WhatsApp number can only contain digits, spaces, +, -, parentheses, and dots'
    })
    .refine((value) => value.replace(/\D/g, '').length >= 7, {
      message: 'WhatsApp number must include at least 7 digits'
    }),
  companyName: optionalText(160, 'Company / Organization'),
  country: optionalText(120, 'Country'),
  projectTitle: z.string().trim().min(3, 'Project title must be at least 3 characters').max(180),
  projectType: z.enum([
    'Website',
    'Web Application',
    'Landing Page',
    'Dashboard',
    'E-commerce Website',
    'School Management System',
    'Business Software',
    'JavaScript Application',
    'Other'
  ]),
  projectDescription: z
    .string()
    .trim()
    .min(10, 'Project description must be at least 10 characters')
    .max(4000),
  requiredFeatures: optionalText(3000, 'Required features'),
  estimatedBudget: optionalText(160, 'Estimated budget'),
  expectedTimeline: optionalText(160, 'Expected timeline'),
  existingDesign: z.boolean().default(false),
  referenceWebsite: urlField,
  additionalInformation: optionalText(3000, 'Additional information')
});

export const jobApplicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(160),
  whatsappNumber: z.string().trim().min(7).max(32),
  country: z.string().trim().min(2).max(120),
  age: z.coerce.number().int().min(16).max(100),
  position: z.enum(careerOpenings.map((opening) => opening.title) as [string, ...string[]]),
  experienceLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  programmingLanguages: z.string().trim().max(500).optional(),
  frameworks: z.string().trim().max(500).optional(),
  technologies: z.string().trim().max(500).optional(),
  portfolioUrl: urlField,
  githubUrl: urlField,
  aboutYourself: z.string().trim().max(2000).optional(),
  whyJoin: z.string().trim().min(20).max(2000),
  contribution: z.string().trim().min(20).max(2000)
});
