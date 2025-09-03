
import Link from 'next/link';
import { CheckCircle, Circle } from 'lucide-react';
import type { Module } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LearningModuleListItemProps {
    pathId: string;
    module: Module;
    isCompleted: boolean;
}

export default function LearningModuleListItem({ pathId, module, isCompleted }: LearningModuleListItemProps) {
    return (
        <Link href={`/learning/${pathId}/${module.id}`} className="block">
            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                {isCompleted ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                )}
                <div className='flex-grow'>
                    <p className={cn("font-semibold", isCompleted && "text-muted-foreground line-through")}>
                        {module.title}
                    </p>
                    <p className={cn("text-sm text-muted-foreground", isCompleted && "line-through")}>
                        {module.description}
                    </p>
                </div>
            </div>
        </Link>
    );
}
