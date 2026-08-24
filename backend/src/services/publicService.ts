import { env } from '../config/env.js';
import { careerOpenings, serviceCatalog } from '../content/publicContent.js';
import { supabaseAdmin } from '../config/supabase.js';
import { buildWhatsappUrl } from '../utils/whatsapp.js';
import type { z } from 'zod';
import type { jobApplicationSchema, projectRequestSchema } from '../validators/publicSchemas.js';

type ProjectRequestInput = z.infer<typeof projectRequestSchema>;
type JobApplicationInput = z.infer<typeof jobApplicationSchema>;

function textOrNull(value?: string) {
  return value?.trim() ? value.trim() : null;
}

function mapExperienceLevel(level: JobApplicationInput['experienceLevel']) {
  switch (level) {
    case 'Beginner':
      return 'BEGINNER';
    case 'Intermediate':
      return 'INTERMEDIATE';
    case 'Advanced':
      return 'ADVANCED';
  }
}

export async function getPublicConfig() {
  return {
    whatsappConfigured: Boolean(env.COMPANY_WHATSAPP_NUMBER),
    whatsappNumber: env.COMPANY_WHATSAPP_NUMBER ?? null
  };
}

export async function listCareerOpenings() {
  return careerOpenings;
}

export async function getCareerOpening(slug: string) {
  return careerOpenings.find((opening) => opening.slug === slug) ?? null;
}

export async function listServices() {
  return serviceCatalog;
}

export async function createProjectRequest(input: ProjectRequestInput) {
  const duplicateCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: duplicate, error: duplicateError } = await supabaseAdmin
    .from('project_requests')
    .select('id, request_code, created_at')
    .eq('email', input.email)
    .eq('project_title', input.projectTitle)
    .gte('created_at', duplicateCutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    throw duplicateError;
  }

  if (duplicate) {
    return {
      kind: 'duplicate' as const,
      code: duplicate.request_code
    };
  }

  const { data, error } = await supabaseAdmin
    .from('project_requests')
    .insert({
      full_name: input.fullName,
      email: input.email,
      whatsapp_number: input.whatsappNumber,
      company_name: textOrNull(input.companyName),
      country: textOrNull(input.country),
      project_title: input.projectTitle,
      project_type: input.projectType,
      project_description: input.projectDescription,
      required_features: textOrNull(input.requiredFeatures),
      estimated_budget: textOrNull(input.estimatedBudget),
      expected_timeline: textOrNull(input.expectedTimeline),
      existing_design: input.existingDesign,
      reference_website: textOrNull(input.referenceWebsite),
      additional_information: textOrNull(input.additionalInformation),
      status: 'PENDING'
    })
    .select('id, request_code')
    .single();

  if (error) {
    throw error;
  }

  const whatsappUrl = env.COMPANY_WHATSAPP_NUMBER
    ? buildWhatsappUrl(
        env.COMPANY_WHATSAPP_NUMBER,
        [
          'Hello Nexaris Technologies,',
          `I just submitted a project request (${data.request_code}).`,
          `Project title: ${input.projectTitle}`,
          `Project type: ${input.projectType}`,
          `Name: ${input.fullName}`,
          `Email: ${input.email}`
        ].join('\n')
      )
    : null;

  return {
    kind: 'created' as const,
    id: data.id,
    code: data.request_code,
    whatsappUrl,
    whatsappConfigured: Boolean(env.COMPANY_WHATSAPP_NUMBER)
  };
}

export async function createJobApplication(input: JobApplicationInput) {
  const duplicateCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: duplicate, error: duplicateError } = await supabaseAdmin
    .from('job_applications')
    .select('id, application_code, created_at')
    .eq('email', input.email)
    .eq('position', input.position)
    .gte('created_at', duplicateCutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    throw duplicateError;
  }

  if (duplicate) {
    return {
      kind: 'duplicate' as const,
      code: duplicate.application_code
    };
  }

  const { data, error } = await supabaseAdmin
    .from('job_applications')
    .insert({
      full_name: input.fullName,
      email: input.email,
      whatsapp_number: input.whatsappNumber,
      country: input.country,
      age: input.age,
      position: input.position,
      experience_level: mapExperienceLevel(input.experienceLevel),
      programming_languages: textOrNull(input.programmingLanguages),
      frameworks: textOrNull(input.frameworks),
      technologies: textOrNull(input.technologies),
      portfolio_url: textOrNull(input.portfolioUrl),
      github_url: textOrNull(input.githubUrl),
      about_yourself: textOrNull(input.aboutYourself),
      motivation: input.whyJoin,
      contribution: input.contribution,
      status: 'PENDING'
    })
    .select('id, application_code')
    .single();

  if (error) {
    throw error;
  }

  const whatsappUrl = env.COMPANY_WHATSAPP_NUMBER
    ? buildWhatsappUrl(
        env.COMPANY_WHATSAPP_NUMBER,
        [
          'Hello Nexaris Technologies,',
          `I just submitted a job application (${data.application_code}).`,
          `Position: ${input.position}`,
          `Name: ${input.fullName}`,
          `Experience: ${input.experienceLevel}`,
          `Email: ${input.email}`
        ].join('\n')
      )
    : null;

  return {
    kind: 'created' as const,
    id: data.id,
    code: data.application_code,
    whatsappUrl,
    whatsappConfigured: Boolean(env.COMPANY_WHATSAPP_NUMBER)
  };
}
