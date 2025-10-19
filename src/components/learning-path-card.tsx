
import Link from 'next/link';
import type { LearningPath } from '@/lib/types';
import { FileText } from 'lucide-react';

type LearningPathCardProps = {
    path: LearningPath;
};

// Note: The 'Icon' property from the database is a string representing the name of a Lucide icon.
// We'll need a way to dynamically render the correct icon based on this string.
// For now, we'll use a placeholder. A more robust solution might involve a mapping object
// or a dynamic import.

export default function LearningPathCard({ path }: LearningPathCardProps) {
    // If you have a mapping from string to icon component, you could use it here.
    // const IconComponent = iconMap[path.Icon] || FileText;

    return (
        <Link href={`/learning/${path.pathId}`} className="block p-6 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
            <div className="flex items-center mb-4">
                {/* <IconComponent className="w-8 h-8 text-gray-500 dark:text-gray-400 mr-4" /> */}
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{path.title}</h2>
            </div>
            <p className="font-normal text-gray-700 dark:text-gray-400 mb-4">{path.description}</p>
            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span>{path.category}</span>
                <span>{path.duration}</span>
            </div>
        </Link>
    );
}
