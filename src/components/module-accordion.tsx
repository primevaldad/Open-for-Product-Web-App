
'use client';

import Link from 'next/link';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import type { Module } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { buildHybridUrl } from '@/lib/slug';

type ModuleAccordionProps = {
    module: Module & { order: number };
    pathId?: string;
    pathTitle?: string;
};

export default function ModuleAccordion({ module, pathId, pathTitle }: ModuleAccordionProps) {
    const detailUrl = pathId && pathTitle
        ? buildHybridUrl(buildHybridUrl('/learning', pathId, pathTitle), module.moduleId, module.title)
        : null;

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
                    <div className="flex flex-col gap-2">
                        {module.contentUrl ? (
                            <a href={module.contentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">View original content</a>
                        ) : (
                            <p className="text-muted-foreground text-sm">No content available.</p>
                        )}
                        {detailUrl && (
                            <div className="mt-2">
                                <Link href={detailUrl}>
                                    <Button size="sm">Go to Module page</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
