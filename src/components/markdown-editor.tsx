'use client';

import { useRef } from 'react';
import { Bold, Italic, Code, Link as LinkIcon, List, Heading, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ReactTextareaAutocomplete, { Item } from "@webscopeio/react-textarea-autocomplete";
import "@webscopeio/react-textarea-autocomplete/style.css";
import { User } from '@/lib/types';
import { UserMentionItem } from './user-mention-item';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  users?: User[]; // Make users optional to handle async loading
}

// There are no official types for this library, so we have to use 'any' here.
const TextareaAutocomplete = ReactTextareaAutocomplete as any;

export function MarkdownEditor({ value, onChange, placeholder, className, users = [] }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleFormat = (formatType: 'bold' | 'italic' | 'code' | 'link' | 'list' | 'heading' | 'external-link') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let markdown;
    let newCursorPosition;

    switch (formatType) {
      case 'bold':
        markdown = `**${selectedText}**`;
        newCursorPosition = start + 2;
        break;
      case 'italic':
        markdown = `*${selectedText}*`;
        newCursorPosition = start + 1;
        break;
      case 'code':
        markdown = "`" + selectedText + "`";
        newCursorPosition = start + 1;
        break;
      case 'link':
        markdown = `[${selectedText}](url)`;
        newCursorPosition = start + 1;
        break;
      case 'external-link':
        markdown = `[${selectedText}](https://)`;
        newCursorPosition = start + 1;
        break;
      case 'list':
        markdown = `\n- ${selectedText}`;
        newCursorPosition = start + 3;
        break;
      case 'heading':
        markdown = `# ${selectedText}`;
        newCursorPosition = start + 2;
        break;
      default:
        return;
    }

    const newValue = value.substring(0, start) + markdown + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition + selectedText.length);
    }, 0);
  };

  const formattingTools = [
    { type: 'bold', icon: Bold, tooltip: 'Bold' },
    { type: 'italic', icon: Italic, tooltip: 'Italic' },
    { type: 'code', icon: Code, tooltip: 'Code' },
    { type: 'link', icon: LinkIcon, tooltip: 'Link' },
    { type: 'external-link', icon: ExternalLink, tooltip: 'External Link' },
    { type: 'list', icon: List, tooltip: 'List' },
    { type: 'heading', icon: Heading, tooltip: 'Heading' },
  ] as const;

  return (
    <Tabs defaultValue="write" className="w-full">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-1 pr-1">
          {formattingTools.map(tool => (
            <Tooltip key={tool.type}>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" onClick={() => handleFormat(tool.type)}>
                  <tool.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tool.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
      <TabsContent value="write">
        <TextareaAutocomplete
          className={`w-full p-2 border rounded-md bg-background text-foreground ${className}`}
          loadingComponent={() => <span>Loading...</span>}
          placeholder={placeholder}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          innerRef={(ref: HTMLTextAreaElement) => {
            (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = ref;
          }}
          minChar={0}
          trigger={{
            '@': {
              dataProvider: (token: string) => {
                if (!users) return []; // Guard against undefined users array
                return users
                  .filter(user => user.name.toLowerCase().includes(token.toLowerCase()))
                  .map(user => ({ 
                      id: user.id,
                      name: user.name,
                      avatarUrl: user.avatarUrl, // Corrected field
                  }));
              },
              component: UserMentionItem,
              output: (item: Item & { id: string }) => `[@${item.name}](/users/${item.id})`,
            },
          }}
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className="prose dark:prose-invert rounded-md border border-input p-4 min-h-[220px]">
           <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({node, ...props}) => {
                if (props.href && (props.href.startsWith('http') || props.href.startsWith('https'))) {
                  return <a {...props} target="_blank" rel="noopener noreferrer" />
                }
                return <a {...props} />
              }
            }}
          >
            {value || "Nothing to preview."}
          </ReactMarkdown>
        </div>
      </TabsContent>
    </Tabs>
  );
}
