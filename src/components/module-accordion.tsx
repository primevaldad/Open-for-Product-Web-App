
'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import Markdown from "@/components/ui/markdown";
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
                    <p className="mb-4 text-muted-foreground">{module.description}</p>
                    <Markdown content={module.content || ''} />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
