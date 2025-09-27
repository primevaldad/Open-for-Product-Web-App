
'use client';

import { useState, useCallback } from 'react';
import { X, Check, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { Tag as GlobalTag } from '@/lib/types';

interface InterestSelectorProps {
  value: string[];
  onChange: (newValues: string[]) => void;
  allTags?: GlobalTag[];
  placeholder?: string;
}

export function InterestSelector({
  value = [],
  onChange,
  allTags = [],
  placeholder = "Select your interests...",
}: InterestSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSelect = useCallback((interest: string) => {
    if (!value.includes(interest)) {
      onChange([...value, interest]);
    }
    setSearchTerm("");
    // Do not close popover on select
  }, [value, onChange]);

  const handleRemove = useCallback((interest: string) => {
    onChange(value.filter(v => v !== interest));
  }, [value, onChange]);

  const handleCreate = useCallback(() => {
    const trimmed = searchTerm.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setSearchTerm("");
  }, [searchTerm, value, onChange]);

  const suggestions = useCallback(() => {
    const available = allTags.filter(tag => !value.includes(tag.display));
    if (!searchTerm) return available.slice(0, 10);
    return available.filter(tag => tag.display.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allTags, value, searchTerm]);

  const showCreateOption = searchTerm.trim() && !allTags.some(t => t.display.toLowerCase() === searchTerm.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 min-h-[2.5rem]">
                {value.map(interest => (
                    <Badge key={interest} variant="secondary" className="gap-1.5 text-sm">
                        {interest}
                        <button
                            aria-label={`Remove ${interest}`}
                            onClick={() => handleRemove(interest)}
                            className="rounded-full hover:bg-background/80 outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-start border-dashed"
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {placeholder}
                </Button>
            </PopoverTrigger>
        </div>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
            <CommandInput 
                value={searchTerm} 
                onValueChange={setSearchTerm} 
                placeholder="Search interests..." 
                autoFocus 
            />
            <CommandList>
                {suggestions().length > 0 && (
                    <CommandGroup heading="Suggestions">
                        {suggestions().map(tag => (
                            <CommandItem 
                                key={tag.id} 
                                value={tag.display} 
                                onSelect={() => handleSelect(tag.display)}
                            >
                                <Check className={cn("mr-2 h-4 w-4", value.includes(tag.display) ? "opacity-100" : "opacity-0")} />
                                {tag.display}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
                {showCreateOption && (
                    <CommandGroup heading="Create New Interest">
                        <CommandItem value={searchTerm} onSelect={handleCreate}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create "{searchTerm}"
                        </CommandItem>
                    </CommandGroup>
                )}
                {!showCreateOption && suggestions().length === 0 && (
                    <CommandEmpty>No interests found.</CommandEmpty>
                )}
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
