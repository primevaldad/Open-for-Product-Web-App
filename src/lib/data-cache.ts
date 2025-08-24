
import fs from 'fs/promises';
import path from 'path';
import type { Project, Task, User, UserLearningProgress, Interest } from '@/lib/types';

// This is a server-side only file.
// Do not import it into client components.

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');
const ENCODING = 'utf-8';

interface AppData {
    users: User[];
    projects: Project[];
    tasks: Task[];
    currentUserLearningProgress: UserLearningProgress[];
    interests: Interest[];
    currentUserIndex: number;
}

let dataCache: AppData | null = null;
let writeTimeout: NodeJS.Timeout | null = null;

function serializeContent(data: AppData): string {
    const userStrings = data.users.map(u => {
        const interestsString = u.interests ? `interests: [${u.interests.map(i => `'${i.replace(/'/g, "\\'")}'`).join(', ')}]` : '';
        const onboardedString = `onboarded: ${u.onboarded}`;
        const bioString = u.bio ? `bio: \`${u.bio.replace(/`/g, "\\`")}\`` : '';
        
        const fields = [
            `id: '${u.id}'`,
            `name: '${u.name.replace(/'/g, "\\'")}'`,
            `avatarUrl: '${u.avatarUrl}'`,
            bioString,
            interestsString,
            onboardedString
        ].filter(Boolean).join(',\n    ');

        return `  { \n    ${fields} \n  }`;
    }).join(',\n');

    const projectStrings = data.projects.map(p => {
        const teamString = p.team.map(m => `{ user: users.find(u => u.id === '${m.user.id}')!, role: '${m.role}' }`).join(',\n        ');
        const contributionNeedsString = p.contributionNeeds.map(n => `'${n.replace(/'/g, "\\'")}'`).join(', ');
        
        let governanceString = '';
        if (p.governance) {
            governanceString = `\n    governance: {
      contributorsShare: ${p.governance.contributorsShare},
      communityShare: ${p.governance.communityShare},
      sustainabilityShare: ${p.governance.sustainabilityShare},
    },`;
        }

        const isExpertReviewedString = p.isExpertReviewed ? `\n    isExpertReviewed: ${p.isExpertReviewed},` : '';

        return `  {
    id: '${p.id}',
    name: '${p.name.replace(/'/g, "\\'")}',
    tagline: '${p.tagline.replace(/'/g, "\\'")}',
    description: \`${p.description.replace(/`/g, "\\`")}\`,
    category: '${p.category}',
    timeline: '${p.timeline.replace(/'/g, "\\'")}',
    contributionNeeds: [${contributionNeedsString}],
    progress: ${p.progress},
    team: [
        ${teamString}
    ],
    votes: ${p.votes},
    discussions: ${p.discussions},${isExpertReviewedString}
    status: '${p.status}',${governanceString}
  }`;
    }).join(',\n');

    const taskStrings = data.tasks.map(t => {
        const assignedToString = t.assignedTo ? `assignedTo: users.find(u => u.id === '${t.assignedTo!.id}')` : 'assignedTo: undefined';
        const descriptionString = t.description ? `description: \`${t.description.replace(/`/g, "\\`")}\`` : '';
        const estimatedHoursString = t.estimatedHours ? `estimatedHours: ${t.estimatedHours}` : '';

        const fields = [
            `id: '${t.id}'`,
            `projectId: '${t.projectId}'`,
            `title: '${t.title.replace(/'/g, "\\'")}'`,
            descriptionString,
            `status: '${t.status}'`,
            assignedToString,
            estimatedHoursString
        ].filter(Boolean).join(', ');

        return `    { ${fields} }`;
    }).join(',\n');
    
    const progressStrings = data.currentUserLearningProgress.map(p => {
        const completedModulesString = p.completedModules.map(m => `'${m}'`).join(', ');
        return `    {
        userId: '${p.userId}',
        pathId: '${p.pathId}',
        completedModules: [${completedModulesString}],
    }`;
    }).join(',\n');

    const interestStrings = data.interests.map(i => `  { id: '${i.id}', name: '${i.name.replace(/'/g, "\\'")}' }`).join(',\n');

    return `
import type { Project, Task, User, UserLearningProgress, ProjectCategory, Interest } from './types';
import { Code, BookText, Users as UsersIcon, Handshake, Briefcase, FlaskConical } from 'lucide-react';
import type { LearningPath } from './types';

export const users: User[] = [\n${userStrings}\n];

export let currentUser: User = users[${data.currentUserIndex}];

export const projects: Project[] = [\n${projectStrings}\n];

export let tasks: Task[] = [\n${taskStrings}\n];

export const projectCategories = [
    { name: 'Creative', icon: Code },
    { name: 'Technical', icon: BookText },
    { name: 'Community', icon: UsersIcon },
    { name: 'Business & Enterprise', icon: Briefcase },
    { name: 'Learning & Research', icon: FlaskConical },
] as const;

export const learningPaths: LearningPath[] = [
  {
    id: 'lp1',
    title: 'Foundations of Ethical AI',
    description: 'Learn the core principles of ethical AI and apply them to real-world projects.',
    category: 'Technical',
    duration: '4 Weeks',
    Icon: FlaskConical,
    modules: [
        { id: 'm1', title: 'Introduction to AI Ethics', description: 'What is ethical AI and why does it matter?', content: 'This module covers the basics of AI ethics...', videoUrl: 'https://www.youtube.com/embed/pS05iU_34x0' },
        { id: 'm2', title: 'Fairness and Bias', description: 'Understanding and mitigating bias in AI systems.', content: 'This module dives deep into algorithmic bias...', videoUrl: 'https://www.youtube.com/embed/pS05iU_34x0' },
    ]
  },
  {
    id: 'lp2',
    title: 'Community Management 101',
    description: 'Master the art of building and nurturing online communities.',
    category: 'Community',
    duration: '2 Weeks',
    Icon: Handshake,
    isLocked: true,
    modules: [
        { id: 'm1', title: 'Community Engagement Strategies', description: 'Learn how to keep your community active.', content: 'Content for community engagement...' },
    ]
  },
  // Add more learning paths...
];

export let currentUserLearningProgress: UserLearningProgress[] = [\n${progressStrings}\n];

export const interests: Interest[] = [\n${interestStrings}\n];
`;
}

async function readData(): Promise<AppData> {
    // Dynamically import the data file to get the latest version
    const dataModule = await import(`./data.ts?timestamp=${Date.now()}`);
    
    const currentUserIndex = dataModule.users.findIndex((u: User) => u.id === dataModule.currentUser.id);
    
    return {
        users: dataModule.users,
        projects: dataModule.projects,
        tasks: dataModule.tasks,
        currentUserLearningProgress: dataModule.currentUserLearningProgress,
        interests: dataModule.interests,
        currentUserIndex: currentUserIndex !== -1 ? currentUserIndex : 0,
    };
}


export async function getData(): Promise<AppData> {
    if (!dataCache) {
        dataCache = await readData();
    }
    // Return a deep copy to prevent direct mutation of the cache
    return JSON.parse(JSON.stringify(dataCache));
}

export async function setData(newData: AppData): Promise<void> {
    dataCache = JSON.parse(JSON.stringify(newData)); // Update cache with a deep copy

    if (writeTimeout) {
        clearTimeout(writeTimeout);
    }

    // Debounce writes to the file system
    writeTimeout = setTimeout(async () => {
        try {
            const serializedData = serializeContent(dataCache!);
            await fs.writeFile(dataFilePath, serializedData, ENCODING);
        } catch (error) {
            console.error("Error writing data file:", error);
        }
        writeTimeout = null;
    }, 500);
}

export async function updateCurrentUser(index: number): Promise<void> {
    const data = await getData();
    data.currentUserIndex = index;
    await setData(data);
}
