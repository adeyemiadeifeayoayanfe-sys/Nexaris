export type PublicConfig = {
  whatsappConfigured: boolean;
  whatsappNumber: string | null;
};

export type ServiceItem = {
  slug: string;
  title: string;
  description: string;
};

export type CareerOpening = {
  slug: string;
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  experienceLevel: string;
};

export type AuthProfile = {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string;
  role: 'ADMIN' | 'WORKER' | 'CLIENT';
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
};
