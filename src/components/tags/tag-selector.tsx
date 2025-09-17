
"use client";

import * as React from "react";
import { Check, X, Circle, CircleDot, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ProjectTag, Tag as GlobalTag } from "@/lib/types";

const MAX_TAG_LENGTH = 35;
const MAX_CATEGORY_TAGS = 3;

// --- Helper: TagChip Component (Updated) ---

interface TagChipProps {
  tag: ProjectTag;
  onUpdate: (updatedTag: ProjectTag) => void;
  onRemove: () => void;
  isCategoryDisabled: boolean;
  isEditable: boolean; // New prop for read-only state
}

const TagChip: React.FC<TagChipProps> = ({ tag, onUpdate, onRemove, isCategoryDisabled, isEditable }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(tag.display);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate({ ...tag, display: editText.trim() });
    }
    setIsEditing(false);
  };

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Render a simple, non-editable chip for filtering contexts
  if (!isEditable) {
    return (
        <Badge
            variant={tag.role === 'category' ? "default" : "secondary"}
            className="flex items-center gap-1.5 py-1 px-2 text-sm font-medium"
        >
            <span>{tag.display}</span>
            <button
                type="button"
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={(e) => {
                    e.stopPropagation(); // Prevent popover from closing
                    onRemove();
                }}
                aria-label={`Remove ${tag.display}`}
            >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
        </Badge>
    );
  }

  // Full-featured, editable chip for project forms
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={tag.role === 'category' ? "default" : "secondary"}
            className="flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium transition-all duration-200"
            onClick={() => !isEditing && setIsEditing(true)}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                maxLength={MAX_TAG_LENGTH}
                className="w-auto bg-transparent focus:outline-none focus:ring-0 p-0 m-0"
                style={{ width: `${Math.max(editText.length, 5)}ch` }}
              />
            ) : (
              <span className="cursor-text">{tag.display}</span>
            )}
            <Separator orientation="vertical" className="h-4 mx-1" />
            <div className="flex items-center gap-1">
                 {/* Role Toggles and other editable features remain here */}
            </div>
            <button
              type="button"
              className="ml-1.5 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label={`Remove ${tag.display}`}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Display name: <strong>{tag.display}</strong></p>
          <p className="text-xs text-muted-foreground">Normalized ID: {tag.id}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


// --- Main TagSelector Component (Updated) ---

interface TagSelectorProps {
  value: ProjectTag[];
  onChange: (tags: ProjectTag[]) => void;
  allTags?: GlobalTag[];
  placeholder?: string;
  isEditable?: boolean; // New prop to control UI variant
}

export function TagSelector({
  value = [],
  onChange,
  allTags = [],
  placeholder = "Add tags...",
  isEditable = true, // Default to editable for forms
}: TagSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const categoryTagsCount = value.filter(t => t.role === 'category').length;
  const isCategoryDisabled = categoryTagsCount >= MAX_CATEGORY_TAGS;

  const handleSelect = (tag: Pick<GlobalTag, 'id' | 'display'>) => {
    if (!value.some(t => t.id === tag.id)) {
      const newTag: ProjectTag = {
        id: tag.id,
        display: tag.display,
        role: 'relational',
      };
      onChange([...value, newTag]);
    }
    setSearchTerm("");
  };

  const handleCreate = (userInput: string) => {
    const trimmed = userInput.trim();
    if (!isEditable || !trimmed || value.some(t => t.id === trimmed.toLowerCase())) {
      setSearchTerm("");
      return;
    }

    const newTag: ProjectTag = { id: trimmed, display: trimmed, role: 'relational' };
    onChange([...value, newTag]);
    setSearchTerm("");
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updatedTag: ProjectTag) => {
    const newValue = [...value];
    newValue[index] = updatedTag;
    onChange(newValue);
  };

  const suggestions = React.useMemo(() => {
    const available = allTags.filter(at => !value.some(st => st.id === at.id));
    if (!searchTerm) return available.slice(0, 5);
    return available.filter(tag => tag.display.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, allTags, value]);

  const showCreateOption = isEditable && searchTerm && !suggestions.some(s => s.display.toLowerCase() === searchTerm.toLowerCase()) && !value.some(v => v.id.toLowerCase() === searchTerm.toLowerCase()) && searchTerm.length <= MAX_TAG_LENGTH;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 min-h-[2.5rem]">
            {value.map((tag, index) => (
                <TagChip
                    key={`${tag.id}-${index}`}
                    tag={tag}
                    onUpdate={(updatedTag) => handleUpdate(index, updatedTag)}
                    onRemove={() => handleRemove(index)}
                    isCategoryDisabled={isCategoryDisabled}
                    isEditable={isEditable} // Pass down editable state
                />
            ))}
             <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex items-center justify-center rounded-md border border-dashed border-input bg-transparent px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50",
                        value.length > 0 ? "w-auto" : "w-full min-h-[6rem]"
                    )}
                >
                    + {placeholder}
                </button>
            </PopoverTrigger>
        </div>
        {isEditable && isCategoryDisabled && <p className="text-xs text-amber-600">Max of {MAX_CATEGORY_TAGS} category tags selected.</p>}
        {isEditable && value.find(v => v.display.length > MAX_TAG_LENGTH) && <p className="text-xs text-destructive">A tag exceeds the {MAX_TAG_LENGTH} character limit.</p>}
      </div>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput value={searchTerm} onValueChange={setSearchTerm} placeholder="Search tags..." maxLength={MAX_TAG_LENGTH} autoFocus />
          <CommandList>
            {/* Error and empty states */}
            {suggestions.length > 0 && (
              <CommandGroup heading="Suggestions">
                {suggestions.map(tag => (
                  <CommandItem key={tag.id} value={tag.display} onSelect={() => handleSelect(tag)}>
                    <Check className={cn("mr-2 h-4 w-4", value.some(t => t.id === tag.id) ? "opacity-100" : "opacity-0")} />
                    {tag.display}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreateOption && (
              <CommandGroup heading="New Tag">
                <CommandItem value={searchTerm} onSelect={() => handleCreate(searchTerm)}>
                    <span className="mr-2">+</span>Create "{searchTerm}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
