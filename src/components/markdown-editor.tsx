
'use client';

import { useRef } from 'react';
import { Bold, Italic, Code, Link as LinkIcon, List, Heading, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({ value, onChange, placeholder, className }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          rows={10}
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
