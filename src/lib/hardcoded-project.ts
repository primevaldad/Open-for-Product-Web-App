import { HydratedProject } from './types';

// The project data is hardcoded to be displayed when AI suggestions are not available.
// The dates are strings because this object is used on the client-side
// after serialization. The type casting (`as any`) is a workaround for the fact
// that the 'HydratedProject' type expects Firestore Timestamps.
export const hardcodedProject: HydratedProject = {
  id: 'project-discovery-app-template',
  name: 'Project Discovery Platform',
  description: 'A platform for developers to discover and collaborate on projects. This is the very app you are using right now! Why not join the team and help us build the future of open source collaboration?',
  tags: [
    { id: 'nextjs', display: 'Next.js', type: 'framework' },
    { id: 'react', display: 'React', type: 'framework' },
    { id: 'typescript', display: 'TypeScript', type: 'language' },
    { id: 'tailwind-css', display: 'Tailwind CSS', type: 'library' },
    { id: 'firebase', display: 'Firebase', type: 'tool' },
  ],
  team: [
    {
      role: 'owner',
      userId: 'firebase-team',
      user: {
        id: 'firebase-team',
        name: 'The Firebase Team',
        image: 'https://firebase.google.com/static/downloads/brand-guidelines/PNG/logo-logomark.png',
        createdAt: '2023-01-01T00:00:00.000Z' as any,
        updatedAt: '2023-01-01T00:00:00.000Z' as any,
        onboarded: true,
      },
    },
  ],
  status: 'published',
  createdAt: '2024-01-15T00:00:00.000Z' as any,
  updatedAt: '2024-01-15T00:00:00.000Z' as any,
  coverImage: 'https://firebasestorage.googleapis.com/v0/b/conference-app-2024.appspot.com/o/project-discovery-cover.png?alt=media&token=e5a3b8c0-8d6b-42c7-8c3e-2f523e3e3e3e',
  githubLink: 'https://github.com/Firebase/project-discovery-app',
  isTemplate: true,
};