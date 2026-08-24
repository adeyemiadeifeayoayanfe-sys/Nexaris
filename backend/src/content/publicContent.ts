export const serviceCatalog = [
  {
    slug: 'web-development',
    title: 'Web Development',
    description: 'End-to-end website builds with maintainable architecture and performance-focused delivery.'
  },
  {
    slug: 'frontend-development',
    title: 'Frontend Development',
    description: 'Responsive interfaces, design systems, and application shells built for real product teams.'
  },
  {
    slug: 'backend-development',
    title: 'Backend Development',
    description: 'Robust APIs, secure data flows, and integration layers that support production workloads.'
  },
  {
    slug: 'full-stack-development',
    title: 'Full-Stack Development',
    description: 'Unified product delivery across interface, API, database, and deployment boundaries.'
  },
  {
    slug: 'ui-ux-design',
    title: 'UI/UX Design',
    description: 'Clear user journeys, component thinking, and practical product design for business outcomes.'
  },
  {
    slug: 'javascript-applications',
    title: 'JavaScript Applications',
    description: 'Custom browser-based tools and interactive application experiences built with modern JavaScript.'
  },
  {
    slug: 'business-websites',
    title: 'Business Websites',
    description: 'Professional company sites designed to communicate trust, capability, and clarity.'
  },
  {
    slug: 'custom-web-applications',
    title: 'Custom Web Applications',
    description: 'Purpose-built internal or client-facing systems tailored to operational workflows.'
  },
  {
    slug: 'automation',
    title: 'Automation',
    description: 'Workflow automation, process reduction, and integration logic for repetitive digital tasks.'
  }
] as const;

export const careerOpenings = [
  {
    slug: 'css-stylist',
    title: 'CSS Stylist',
    summary: 'Own layout polish, responsive execution, and visual consistency across production interfaces.',
    responsibilities: [
      'Translate approved UI direction into production-ready CSS.',
      'Maintain responsive behavior across desktop, tablet, and mobile layouts.',
      'Work with frontend developers to keep components visually consistent.'
    ],
    requirements: [
      'Strong CSS fundamentals including layout, spacing, typography, and responsive design.',
      'Comfort reviewing design intent and improving interface clarity.',
      'Ability to organize styles cleanly in a growing codebase.'
    ],
    skills: ['CSS', 'Responsive Design', 'UI Polish', 'Accessibility'],
    experienceLevel: 'Intermediate'
  },
  {
    slug: 'backend-designer',
    title: 'Backend Designer',
    summary: 'Design APIs, data flows, and service logic that support secure, maintainable application delivery.',
    responsibilities: [
      'Design and implement backend routes and business logic.',
      'Work with database schemas, validation rules, and service boundaries.',
      'Support secure integration between frontend, backend, and Supabase.'
    ],
    requirements: [
      'Solid Node.js and API design experience.',
      'Comfort with data modeling and server-side validation.',
      'Ability to reason about authorization and operational reliability.'
    ],
    skills: ['Node.js', 'Express', 'PostgreSQL', 'API Design'],
    experienceLevel: 'Advanced'
  },
  {
    slug: 'frontend-designer',
    title: 'Frontend Designer',
    summary: 'Build thoughtful, responsive interfaces that turn product requirements into usable web experiences.',
    responsibilities: [
      'Implement reusable React components and page layouts.',
      'Collaborate on form flows, interaction states, and responsive behavior.',
      'Keep UI code maintainable and aligned with product architecture.'
    ],
    requirements: [
      'Strong React and modern frontend development skills.',
      'Comfort implementing product flows, states, and form UX.',
      'Ability to work closely with design and backend constraints.'
    ],
    skills: ['React', 'TypeScript', 'Modern CSS', 'Component Architecture'],
    experienceLevel: 'Intermediate'
  },
  {
    slug: 'full-stack-developer',
    title: 'Full-Stack Developer',
    summary: 'Work across interface, API, and data boundaries to help deliver complete product increments.',
    responsibilities: [
      'Build features spanning frontend, backend, and database layers.',
      'Help maintain secure architecture and delivery quality.',
      'Contribute to implementation planning, debugging, and production readiness.'
    ],
    requirements: [
      'Comfort across React, Node.js, and relational data flows.',
      'Ability to move between UI, API, and schema-level concerns.',
      'Strong debugging and ownership habits.'
    ],
    skills: ['React', 'Node.js', 'Supabase', 'System Thinking'],
    experienceLevel: 'Advanced'
  }
] as const;
