import { HydratedProject } from './types';

// The project data is hardcoded to be displayed when AI suggestions are not available.
// The dates are strings because this object is used on the client-side
// after serialization. The type casting (`as any`) is a workaround for the fact
// that the 'HydratedProject' type expects Firestore Timestamps.
export const hardcodedProject: HydratedProject = {
  id: 'project-discovery-app-template',
  name: 'Project Discovery Platform',
  description: 'A platform for developers to discover and collaborate on projects. This is the very app you are using right now! Why not join the team and help us build the future of open source collaboration?',
  tagline: 'Discover, Collaborate, and Build the Future of Open Source.',
  owner: {} as any, // This is a placeholder, as the owner is not needed for the hardcoded project
  tags: [
    { id: 'nextjs', display: 'Next.js', type: 'category' },
    { id: 'react', display: 'React', type: 'category' },
    { id: 'typescript', display: 'TypeScript', type: 'category' },
    { id: 'tailwind-css', display: 'Tailwind CSS', type: 'category' },
    { id: 'firebase', display: 'Firebase', type: 'category' },
  ],
  team: [
    {
      role: 'lead',
      userId: 'firebase-team',
      user: {
        id: 'firebase-team',
        name: 'The Firebase Team',
        avatarUrl: 'https://firebase.google.com/static/downloads/brand-guidelines/PNG/logo-logomark.png',
        createdAt: '2023-01-01T00:00:00.000Z' as any,
        updatedAt: '2023-01-01T00:00:00.000Z' as any,
        onboardingCompleted: true,
        email: 'email',
        bio: 'bio',
        interests: [],
        draftProjects: [],

      },
    },
  ],
  status: 'published',
  createdAt: '2024-01-15T00:00:00.000Z' as any,
  updatedAt: '2024-01-15T00:00:00.000Z' as any,
  contributionNeeds: [],
  progress: 75,
};