
'use client';

import * as React from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { Tag as GlobalTag, ProjectTag } from "@/lib/types";

export interface TagSelectorProps {
  tags: GlobalTag[];
  value: ProjectTag[];
  onChange: (value: ProjectTag[]) => void;
}


// Normalize a tag string for consistent matching
const normalizeTag = (tag: string) => tag.toLowerCase().trim();

export default function TagSelector({ tags, value, onChange }: TagSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Memoize for performance
  const globalTagsMap = React.useMemo(() => new Map(tags.map(t => [normalizeTag(t.id), t])), [tags]);
  const selectedTagsMap = React.useMemo(() => new Map(value.map(pt => [normalizeTag(pt.id), pt])), [value]);

  const handleSelect = (tagId: string, display: string) => {
    const normalizedId = normalizeTag(tagId);
    if (selectedTagsMap.has(normalizedId)) return;

    const existingGlobalTag = globalTagsMap.get(normalizedId);
    const newProjectTag: ProjectTag = {
      id: normalizedId,
      display: display,
      type: existingGlobalTag?.type || 'custom',
    };
    onChange([...value, newProjectTag]);
  };

  const handleRemove = (tagId: string) => {
    const normalizedId = normalizeTag(tagId);
    onChange(value.filter(pt => normalizeTag(pt.id) !== normalizedId));
  };

  const handleCreate = (newTagDisplay: string) => {
    if (!newTagDisplay) return;
    const newTagId = newTagDisplay.replace(/\s+/g, '-'); // Simple slugification
    handleSelect(newTagId, newTagDisplay);
    setInputValue(""); // Clear input after creation
  };

  const filteredGlobalTags = React.useMemo(() => {
    return tags.filter(tag => !selectedTagsMap.has(normalizeTag(tag.id)));
  }, [tags, selectedTagsMap]);

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto"
          >
            <div className="flex flex-wrap gap-1">
              {value.length === 0 && "Select tags..."}
              {value.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
                  {tag.display}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemove(tag.id);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            e.preventDefault();
                            handleRemove(tag.id);
                        }
                    }}
                    className="rounded-full hover:bg-muted-foreground/20 p-0.5 cursor-pointer"
                  >
                    <X size={12} />
                  </div>
                </Badge>
              ))}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}> {/* Custom filtering logic handled via inputValue */}
            <CommandInput 
                placeholder="Search or create tags..." 
                value={inputValue}
                onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {inputValue && !globalTagsMap.has(normalizeTag(inputValue)) && !selectedTagsMap.has(normalizeTag(inputValue)) && (
                  <CommandItem onSelect={() => handleCreate(inputValue)} className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" /> Create "{inputValue}"
                  </CommandItem>
                )}
                {filteredGlobalTags
                  .filter(tag => 
                    normalizeTag(tag.display).includes(normalizeTag(inputValue))
                  )
                  .map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => {
                        handleSelect(tag.id, tag.display);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", "opacity-0")}
                      />
                      {tag.display}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
