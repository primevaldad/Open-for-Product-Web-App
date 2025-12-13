
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { upsertTag } from '@/app/actions/tags';
import type { GlobalTag } from '@/lib/types';

interface TagSelectorProps<T extends { id: string; display: string }> {
  id?: string;
  availableTags?: GlobalTag[];
  value?: T[];
  onChange: (value: T[]) => void;
  tagFactory: (tag: { id: string; display: string }) => T;
}

const normalizeTag = (tag: string) => tag.toLowerCase().trim();

export default function TagSelector<T extends { id: string; display: string }>({
  id,
  availableTags,
  value,
  onChange,
  tagFactory,
}: TagSelectorProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const safeAvailableTags = Array.isArray(availableTags) ? availableTags : [];
  const safeValue = Array.isArray(value) ? value : [];

  const selectedTagsMap = React.useMemo(
    () => new Map(safeValue.map((t) => [normalizeTag(t.id), t])),
    [safeValue]
  );

  const handleSelect = (tag: GlobalTag) => {
    if (selectedTagsMap.has(normalizeTag(tag.id))) return;
    const newTag = tagFactory(tag);
    onChange([...safeValue, newTag]);
  };

  const handleRemove = (tagId: string) => {
    const normalizedId = normalizeTag(tagId);
    onChange(safeValue.filter((t) => normalizeTag(t.id) !== normalizedId));
  };

  const handleCreate = async (newTagDisplay: string) => {
    if (!newTagDisplay) return;
    const newTagId = newTagDisplay.replace(/\s+/g, '-');
    
    const result = await upsertTag({ id: newTagId, display: newTagDisplay });
    
    if (result.success && result.data) {
      handleSelect(result.data);
    } else {
      console.error("Failed to create tag:", result.error);
    }
    setInputValue('');
  };
  
  const filteredGlobalTags = React.useMemo(() => {
    const lowercasedInput = inputValue.toLowerCase();
    return safeAvailableTags.filter(
      (tag) =>
        !selectedTagsMap.has(normalizeTag(tag.id)) &&
        tag.display.toLowerCase().includes(lowercasedInput)
    );
  }, [safeAvailableTags, selectedTagsMap, inputValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[2.5rem]"
        >
          <div className="flex flex-wrap gap-1">
            {safeValue.length === 0 && (
              <span className="text-muted-foreground">Select tags...</span>
            )}
            {safeValue.map((tag) => (
              <Badge
                key={tag.id}
                variant={'secondary'}
                className="flex items-center gap-1.5"
              >
                {tag.display}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${tag.display}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(tag.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      handleRemove(tag.id);
                    }
                  }}
                  className="rounded-full hover:bg-muted-foreground/20 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </span>
              </Badge>
            ))}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or create tags..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue && (
                <div
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  onClick={() => handleCreate(inputValue)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create "{inputValue}"
                </div>
              )}
              {!inputValue && 'No tags found.'}
            </CommandEmpty>
            <CommandGroup>
              {filteredGlobalTags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  value={tag.id}
                  onSelect={() => {
                    handleSelect(tag);
                    setInputValue('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedTagsMap.has(normalizeTag(tag.id))
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {tag.display}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
