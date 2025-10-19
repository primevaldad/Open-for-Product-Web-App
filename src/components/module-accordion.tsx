
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Module } from '@/lib/types';

type ModuleAccordionProps = {
    module: Module;
};

export default function ModuleAccordion({ module }: ModuleAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-200 dark:border-gray-700">
            <button
                className="w-full flex justify-between items-center p-5 text-left font-medium text-gray-900 dark:text-white"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{module.title}</span>
                <ChevronDown className={`w-6 h-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-5 border-t border-gray-200 dark:border-gray-700">
                    <p className="mb-2 text-gray-500 dark:text-gray-400">{module.description}</p>
                    {/* A placeholder for where the module's content would be rendered */}
                    <div className="prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: module.content || '' }}></div>
                </div>
            )}
        </div>
    );
}
