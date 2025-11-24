'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X, PlusCircle, Settings2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { Tag, ProjectTag } from '@/lib/types';

interface AdvancedTagSelectorProps {
  id?: string;
  availableTags?: Tag[];
  value?: ProjectTag[];
  onChange: (value: ProjectTag[]) => void;
  isProject?: boolean; // Flag to show project-specific features
}

const normalizeTag = (tag: string) => tag.toLowerCase().trim();

export default function AdvancedTagSelector({
  id,
  availableTags,
  value,
  onChange,
  isProject = false,
}: AdvancedTagSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [editingTag, setEditingTag] = React.useState<ProjectTag | null>(null);
  const [customDisplayName, setCustomDisplayName] = React.useState('');
  const [isCategory, setIsCategory] = React.useState(false);

  const safeAvailableTags = Array.isArray(availableTags) ? availableTags : [];
  const safeValue = Array.isArray(value) ? value : [];

  const globalTagsMap = React.useMemo(
    () => new Map(safeAvailableTags.map((t) => [normalizeTag(t.id), t])),
    [safeAvailableTags]
  );

  const selectedTagsMap = React.useMemo(
    () => new Map(safeValue.map((pt) => [normalizeTag(pt.id), pt])),
    [safeValue]
  );

  const handleSelect = (tagId: string, display: string) => {
    const normalizedId = normalizeTag(tagId);
    if (selectedTagsMap.has(normalizedId)) return;

    const originalTag = globalTagsMap.get(normalizedId);
    const newProjectTag: ProjectTag = {
      id: normalizedId,
      display: display,
      isCategory: originalTag ? originalTag.isCategory : false, 
    };
    onChange([...safeValue, newProjectTag]);
  };

  const handleRemove = (tagId: string) => {
    const normalizedId = normalizeTag(tagId);
    onChange(safeValue.filter((pt) => normalizeTag(pt.id) !== normalizedId));
  };

  const handleCreate = (newTagDisplay: string) => {
    if (!newTagDisplay) return;
    const newTagId = newTagDisplay.replace(/\s+/g, '-'); // Simple slugification
    handleSelect(newTagId, newTagDisplay);
    setInputValue('');
  };

  const handleEdit = (tag: ProjectTag) => {
    setEditingTag(tag);
    setCustomDisplayName(tag.display);
    setIsCategory(tag.isCategory);
  };

  const handleSaveEdit = () => {
    if (!editingTag) return;

    const categoryCount = safeValue.filter(t => t.isCategory && t.id !== editingTag.id).length;
    if (isProject && isCategory && categoryCount >= 3) {
      // Here you might want to show a toast notification
      console.warn("A project can have a maximum of 3 category tags.");
      return; 
    }

    const updatedTags = safeValue.map((t) =>
      t.id === editingTag.id
        ? { ...t, display: customDisplayName, isCategory: isCategory }
        : t
    );
    onChange(updatedTags);
    setEditingTag(null);
  };

  const filteredGlobalTags = React.useMemo(() => {
    const lowercasedInput = inputValue.toLowerCase();
    return safeAvailableTags.filter(
      (tag) =>
        !selectedTagsMap.has(normalizeTag(tag.id)) &&
        tag.display.toLowerCase().includes(lowercasedInput)
    );
  }, [safeAvailableTags, selectedTagsMap, inputValue]);

  const categoryTagsCount = safeValue.filter(t => t.isCategory).length;

  return (
    <div>
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
                  variant={tag.isCategory ? 'secondary' : 'outline'}
                  className="flex items-center gap-1.5"
                >
                  {tag.display}
                  {isProject && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit ${tag.display}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(tag);
                      }}
                      className="rounded-full hover:bg-muted-foreground/20 p-0.5 cursor-pointer"
                    >
                      <Settings2 size={12} />
                    </span>
                  )}
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
                      handleSelect(tag.id, tag.display);
                      setInputValue('');
                      // setOpen(false); // keep the popover open to select more tags
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

      <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-display-name">Display Name</Label>
              <Input
                id="tag-display-name"
                value={customDisplayName}
                onChange={(e) => setCustomDisplayName(e.target.value)}
              />
            </div>
            {isProject && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="category-switch"
                  checked={isCategory}
                  onCheckedChange={setIsCategory}
                  disabled={!isCategory && categoryTagsCount >= 3}
                />
                <Label htmlFor="category-switch">
                  Set as a primary category tag for this project
                </Label>
              </div>
            )}
            {isProject && categoryTagsCount >= 3 && !isCategory && (
                <p className="text-sm text-muted-foreground">A project can have up to 3 category tags.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTag(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
