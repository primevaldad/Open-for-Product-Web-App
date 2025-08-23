import type { Project, User, Task, LearningPath, ProjectCategory, ProjectMember } from './types';
import { Paintbrush, Code, Users, Briefcase, BookOpenCheck } from 'lucide-react';

export const users: User[] = [
  { id: 'u1', name: 'Favor Prime', avatarUrl: 'https://placehold.co/40x40.png', bio: 'Full-stack developer with a passion for open source and community projects.' },
  { id: 'u2', name: 'Sam Smith', avatarUrl: 'https://placehold.co/40x40.png', bio: 'UI/UX designer focused on creating accessible and user-friendly interfaces.' },
  { id: 'u3', name: 'Jordan Lee', avatarUrl: 'https://placehold.co/40x40.png', bio: 'Community manager and outreach specialist. Loves to connect people with opportunities.' },
  { id: 'u4', name: 'Casey Brown', avatarUrl: 'https://placehold.co/40x40.png', bio: 'Project manager and strategist with a background in sustainable business models.' },
];

export const projects: Project[] = [
  {
    id: 'p497',
    name: 'Smocktails',
    tagline: 'Artisinal drink ware art for adult craft night!',
    description: `Artisinal drink ware art for adult craft night!`,
    category: 'Creative',
    timeline: 'TBD',
    contributionNeeds: ['artistry', 'marketing', 'storytelling'],
    progress: 0,
    team: [
        { user: users.find(u => u.id === 'u1')!, role: 'lead' }
    ],
    votes: 0,
    discussions: 0,
    
    status: 'draft',
  },
  {
    id: 'p271',
    name: 'Smocktails',
    tagline: 'Artisinal drink ware art for adult craft night!',
    description: `Art and mixology come together with these create-your-own glasses where the drink inside the glass completes the scene outside the glass.`,
    category: 'Creative',
    timeline: 'TBD',
    contributionNeeds: ['artistry', 'marketing', 'storytelling'],
    progress: 0,
    team: [
        { user: users.find(u => u.id === 'u1')!, role: 'lead' }
    ],
    votes: 0,
    discussions: 0,
    
    status: 'draft',
  },
  {
    id: 'p1',
    name: 'Community Garden Initiative',
    tagline: 'Growing food and community, one garden at a time.',
    description: `A project to build and maintain community gardens in urban spaces, promoting local food production and community engagement.`,
    category: 'Community',
    timeline: '3 Months',
    contributionNeeds: ['Gardening', 'Community Outreach', 'Logistics'],
    progress: 60,
    team: [
        { user: users.find(u => u.id === 'u1')!, role: 'lead' },
        { user: users.find(u => u.id === 'u3')!, role: 'participant' }
    ],
    votes: 128,
    discussions: 12,
    isExpertReviewed: true,
    status: 'published',
  },
  {
    id: 'p2',
    name: 'Open Source Productivity App',
    tagline: 'A mindful productivity tool for non-traditional workers.',
    description: `A cross-platform app designed for neurodiverse individuals, focusing on flexible task management and minimal distractions.`,
    category: 'Technical',
    timeline: '6 Months',
    contributionNeeds: ['React Native', 'UI/UX Design', 'Firebase'],
    progress: 35,
    team: [
        { user: users.find(u => u.id === 'u2')!, role: 'lead' },
        { user: users.find(u => u.id === 'u4')!, role: 'participant' },
        { user: users.find(u => u.id === 'u1')!, role: 'participant' }
    ],
    votes: 256,
    discussions: 45,
    
    status: 'published',
  },
  {
    id: 'p3',
    name: 'Indie Animated Short Film',
    tagline: 'A collaborative story told through open source animation.',
    description: `A collaborative short film project exploring themes of identity and change, using open source animation tools.`,
    category: 'Creative',
    timeline: '1 Year',
    contributionNeeds: ['2D Animation', 'Storyboarding', 'Sound Design'],
    progress: 15,
    team: [
        { user: users.find(u => u.id === 'u2')!, role: 'lead' },
        { user: users.find(u => u.id === 'u1')!, role: 'participant' }
    ],
    votes: 95,
    discussions: 8,
    
    status: 'published',
  },
  {
    id: 'p4',
    name: 'Peer-to-Peer Skill-Share Platform',
    tagline: 'Building a resilient local economy through skill sharing.',
    description: `A decentralized platform for users to trade skills and services without monetary exchange, building a resilient local economy.`,
    category: 'Business & Enterprise',
    timeline: '8 Months',
    contributionNeeds: ['Web3', 'Solidity', 'Marketing'],
    progress: 20,
    team: [
        { user: users.find(u => u.id === 'u4')!, role: 'lead' },
        { user: users.find(u => u.id === 'u3')!, role: 'participant' }
    ],
    votes: 150,
    discussions: 22,
    isExpertReviewed: true,
    status: 'published',
  },
  {
    id: 'p5',
    name: 'Intro to Ethical AI Research Pod',
    tagline: 'Exploring the future of AI, responsibly.',
    description: `A learning group to collectively study the foundations of ethical AI, producing a summary report for a non-technical audience.`,
    category: 'Learning & Research',
    timeline: '2 Months',
    contributionNeeds: ['Research', 'Technical Writing', 'Ethics'],
    progress: 75,
    team: [
        { user: users.find(u => u.id === 'u1')!, role: 'lead' },
        { user: users.find(u => u.id === 'u2')!, role: 'participant' },
        { user: users.find(u => u.id === 'u3')!, role: 'participant' },
        { user: users.find(u => u.id === 'u4')!, role: 'participant' }
    ],
    votes: 180,
    discussions: 30,
    
    status: 'published',
  },
  {
    id: 'p6',
    name: 'Local Mutual Aid Network',
    tagline: 'Connecting neighbors to support each other.',
    description: `A digital platform to facilitate mutual aid requests and offers within local communities, fostering solidarity and support.`,
    category: 'Community',
    timeline: '4 Months',
    contributionNeeds: ['Web Development', 'UX Research', 'Translation'],
    progress: 45,
    team: [
        { user: users.find(u => u.id === 'u3')!, role: 'lead' },
        { user: users.find(u => u.id === 'u1')!, role: 'participant' }
    ],
    votes: 210,
    discussions: 18,
    
    status: 'published',
  }
];

export const tasks: Task[] = [
    { id: 't1', title: 'Draft project proposal & community guidelines', status: 'Done', assignedTo: users[0] },
    { id: 't2', title: 'Set up development environment and CI/CD pipeline', status: 'In Progress', assignedTo: users[1] },
    { id: 't3', title: 'Design initial UI mockups and user flow diagrams', status: 'In Progress', assignedTo: users[3] },
    { id: 't4', title: 'Create database schema for projects and users', status: 'To Do' },
    { id: 't5', title: 'Develop authentication flow with social providers', status: 'To Do' },
    { id: 't6', title: 'Create community outreach and onboarding plan', status: 'To Do' },
    { id: 't7', title: 'Research and select a governance model', status: 'In Progress', assignedTo: users[2] },
    { id: 't8', title: 'Write documentation for contributors', status: 'To Do' },
];

export const learningPaths: LearningPath[] = [
  { id: 'lp1', title: 'From Designer to Frontend Dev', description: 'Leverage your UI/UX skills to build interactive web components people love to use.', category: 'Technical', duration: '12 Weeks', Icon: Code },
  { id: 'lp2', title: 'Creative Project Management', description: 'Learn to lead creative teams and deliver ambitious projects on time and on budget.', category: 'Business & Enterprise', duration: '8 Weeks', Icon: Briefcase, isLocked: true },
  { id: 'lp3', title: 'Community Organizing 101', description: 'Master the art of bringing people together for a common cause and creating lasting change.', category: 'Community', duration: '6 Weeks', Icon: Users },
  { id: 'lp4', title: 'Ethical Product Design', description: 'Dive deep into designing products that are inclusive, fair, and responsible by default.', category: 'Learning & Research', duration: '10 Weeks', Icon: BookOpenCheck, isLocked: true },
];

export const projectCategories: { name: ProjectCategory; icon: React.FC<any> }[] = [
    { name: 'Creative', icon: Paintbrush },
    { name: 'Technical', icon: Code },
    { name: 'Community', icon: Users },
    { name: 'Business & Enterprise', icon: Briefcase },
    { name: 'Learning & Research', icon: BookOpenCheck },
];

export const currentUser: User = users[0];
