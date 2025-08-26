
import type { Project, Task, User, UserLearningProgress, ProjectCategory, Interest } from './types';
import type { LearningPath } from './types';

// Raw data, to be hydrated by other modules
export const rawUsers: Omit<User, 'onboarded'>[] = [
  {
    id: "u1",
    name: "Alex Doe",
    avatarUrl: "https://picsum.photos/id/1005/200/200",
    bio: "Full-stack developer with a passion for open-source and community building.",
    interests: [
      "UI/UX Design",
      "Frontend Development",
      "Community"
    ],
    onboarded: true
  },
  {
    id: "u2",
    name: "Bethany Smith",
    avatarUrl: "https://picsum.photos/id/1011/200/200",
    bio: "Product manager focused on creating user-centric products that solve real-world problems.",
    interests: [
      "Product Management",
      "Community",
      "Business & Enterprise"
    ],
    onboarded: true
  },
  {
    id: "u3",
    name: "Charlie Brown",
    avatarUrl: "https://picsum.photos/id/1012/200/200",
    bio: "Data scientist with a background in machine learning and a love for data visualization.",
    interests: [
      "Data Science",
      "Learning & Research",
      "Technical"
    ],
    onboarded: true
  },
  {
    id: "u4",
    name: "Diana Prince",
    avatarUrl: "https://picsum.photos/id/1013/200/200",
    bio: "UX designer who believes in the power of empathy-driven design to create meaningful experiences.",
    interests: [
      "UI/UX Design",
      "Creative",
      "Frontend Development"
    ],
    onboarded: false
  }
];

export const rawProjects = [
  {
    id: "p1",
    name: "Community Garden Connect",
    tagline: "Connecting local gardeners with community spaces to grow food and build relationships.",
    description: "A platform to help urban residents find and manage plots in community gardens. Features include plot reservations, a shared tool library, and a forum for gardening tips.",
    category: "Community",
    timeline: "3-6 Months",
    contributionNeeds: [
      "UI/UX Design",
      "React",
      "Firebase",
      "Community Management"
    ],
    progress: 75,
    team: [
      {
        user: "u1",
        role: "lead"
      },
      {
        user: "u2",
        role: "participant"
      }
    ],
    votes: 128,
    discussions: [
        {
            id: 'd1',
            user: 'u2',
            content: 'This is a great initiative! I was wondering what the plans are for mobile access?',
            timestamp: '2024-07-28T10:00:00.000Z'
        },
        {
            id: 'd2',
            user: 'u1',
            content: 'Thanks for the feedback! A mobile-responsive web app is the first priority. A native app could be a future goal if there\'s enough interest.',
            timestamp: '2024-07-28T11:30:00.000Z'
        }
    ],
    status: "published",
    isExpertReviewed: true,
    governance: {
      contributorsShare: 70,
      communityShare: 20,
      sustainabilityShare: 10
    }
  },
  {
    id: "p2",
    name: "Open Source Learning Platform",
    tagline: "A collaborative, open-source platform for creating and sharing interactive learning modules.",
    description: "Imagine a Wikipedia for interactive courses. This project aims to build a community-driven platform where anyone can create, share, and translate high-quality educational content.",
    category: "Learning & Research",
    timeline: "6-12 Months",
    contributionNeeds: [
      "Next.js",
      "Instructional Design",
      "GraphQL",
      "Marketing"
    ],
    progress: 45,
    team: [
      {
        user: "u3",
        role: "lead"
      },
      {
        user: "u1",
        role: "participant"
      }
    ],
    votes: 256,
    discussions: [],
    status: "published",
    isExpertReviewed: true,
    governance: {
      contributorsShare: 80,
      communityShare: 10,
      sustainabilityShare: 10
    }
  },
  {
    id: "p3",
    name: "Ethical AI Toolkit",
    tagline: "A library of tools and frameworks for building more transparent and fair AI systems.",
    description: "This project provides developers with resources to audit their models for bias, improve explainability, and ensure their AI applications align with ethical guidelines.",
    category: "Technical",
    timeline: "9 Months",
    contributionNeeds: [
      "Python",
      "Machine Learning",
      "Ethics in AI",
      "Technical Writing"
    ],
    progress: 20,
    team: [
      {
        user: "u2",
        role: "lead"
      }
    ],
    votes: 98,
    discussions: [],
    status: "published"
  },
  {
    id: "p4",
    name: "Creative Portfolio Generator",
    tagline: "An AI-powered tool to help artists and designers create stunning portfolios in minutes.",
    description: "This is a draft project. It is not yet published.",
    category: "Creative",
    timeline: "TBD",
    contributionNeeds: [
      "Generative AI",
      "UI/UX Design",
      "Frontend Development"
    ],
    progress: 0,
    team: [
      {
        user: "u4",
        role: "lead"
      }
    ],
    votes: 0,
    discussions: [],
    status: "draft"
  }
];

export const rawTasks = [
  {
    id: "t1",
    projectId: "p1",
    title: "Design the plot reservation flow",
    description: "Create high-fidelity mockups for the user flow of finding and reserving a garden plot.",
    status: "In Progress",
    assignedTo: "u4",
    estimatedHours: 12
  },
  {
    id: "t2",
    projectId: "p1",
    title: "Set up Firebase authentication",
    description: "Implement email/password and Google social login for the platform.",
    status: "To Do",
    assignedTo: "u1",
    estimatedHours: 8
  },
  {
    id: "t3",
    projectId: "p1",
    title: "Develop the community forum component",
    description: "Build the frontend components for posting and replying to topics.",
    status: "To Do"
  },
  {
    id: "t4",
    projectId: "p2",
    title: "Define GraphQL schema for learning modules",
    description: "Outline the data structure for courses, modules, and user progress.",
    status: "Done",
    assignedTo: "u3",
    estimatedHours: 10
  },
  {
    id: "t5",
    projectId: "p2",
    title: "Build the interactive code editor",
    description: "Integrate a lightweight, in-browser code editor for technical tutorials.",
    status: "In Progress",
    assignedTo: "u1",
    estimatedHours: 24
  },
  {
    id: "t6",
    projectId: "p3",
    title: "Research existing bias detection libraries",
    description: "Compile a list of open-source libraries for auditing ML models.",
    status: "To Do",
    assignedTo: "u2",
    estimatedHours: 16
  }
];

export const rawLearningPaths: Omit<LearningPath, 'Icon'> & { Icon: string }[] = [
  {
    id: "lp1",
    title: "Foundations of Ethical AI",
    description: "Learn the core principles of building fair and transparent AI systems while contributing to a real-world toolkit.",
    category: "Technical",
    duration: "4-6 Weeks",
    modules: [
      {
        id: "m1",
        title: "Introduction to AI Ethics",
        description: "Understand the key concepts and challenges in ethical AI.",
        videoUrl: "https://www.youtube.com/embed/videoseries?list=PLlkb9Qc6fWk8_7g-4E0b4t3-ycrXJvE-c",
        content: "This module covers the fundamental principles of AI ethics, including fairness, accountability, and transparency. You will explore real-world case studies and learn how to identify potential ethical risks in AI projects."
      },
      {
        id: "m2",
        title: "Bias Detection in Machine Learning",
        description: "Explore techniques for identifying and mitigating bias in ML models.",
        videoUrl: "https://www.youtube.com/embed/videoseries?list=PLlkb9Qc6fWk8_7g-4E0b4t3-ycrXJvE-c",
        content: "Dive into the technical aspects of bias detection. This module will introduce you to popular libraries and tools for auditing your models and data for common types of bias."
      }
    ],
    Icon: "Handshake"
  },
  {
    id: "lp2",
    title: "Community Management 101",
    description: "Master the art of building and nurturing vibrant online and offline communities.",
    category: "Community",
    duration: "3 Weeks",
    isLocked: true,
    modules: [
      {
        id: "m1",
        title: "Building Your Community Strategy",
        description: "Define your community goals and create a roadmap for success.",
        content: "Learn how to create a comprehensive community strategy from the ground up."
      }
    ],
    Icon: "UsersIcon"
  },
  {
    id: "lp3",
    title: "Advanced Frontend with Next.js",
    description: "Deepen your Next.js skills by building complex, interactive user interfaces.",
    category: "Technical",
    duration: "8 Weeks",
    isLocked: true,
    modules: [
      {
        id: "m1",
        title: "Mastering Server Components",
        description: "Understand the power of React Server Components in Next.js.",
        content: "This module explores the new app router and the role of server components."
      }
    ],
    Icon: "Code"
  }
];

export const rawProgress: UserLearningProgress[] = [
  {
    userId: "u1",
    pathId: "lp1",
    completedModules: [
      "m1"
    ]
  }
];

export const rawInterests: Interest[] = [
  {
    id: "i1",
    name: "UI/UX Design"
  },
  {
    id: "i2",
    name: "Frontend Development"
  },
  {
    id: "i3",
    name: "Backend Development"
  },
  {
    id: "i4",
    name: "Community"
  },
  {
    id: "i5",
    name: "Product Management"
  },
  {
    id: "i6",
    name: "Data Science"
  },
  {
    id: "i7",
    name: "Learning & Research"
  },
  {
    id: "i8",
    name: "Business & Enterprise"
  },
  {
    id: "i9",
    name: "Creative"
  },
  {
    id: "i10",
    name: "Technical"
  }
];

    