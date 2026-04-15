
'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import type { Module } from '@/lib/types';

type ModuleAccordionProps = {
    module: Module & { order: number };
};

export default function ModuleAccordion({ module }: ModuleAccordionProps) {
    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value={`item-${module.moduleId}`}>
                <AccordionTrigger>
                    <div className="flex items-center gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            {module.order}
                        </div>
                        <span className="text-lg font-semibold">{module.title}</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pl-12">
                    {module.contentUrl ? (
                        <a href={module.contentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">View content</a>
                    ) : (
                        <p className="text-muted-foreground text-sm">No content available.</p>
                    )}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
