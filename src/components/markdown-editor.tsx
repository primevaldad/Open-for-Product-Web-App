'use client';

import { Bold, Code, Italic, Link as LinkIcon, List, Heading, ExternalLink } from 'lucide-react';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import { Markdown } from 'tiptap-markdown';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from 'rehype-highlight';
import tippy from 'tippy.js';
import 'highlight.js/styles/github-dark.css';
import 'tippy.js/dist/tippy.css';

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { User } from '@/lib/types';
import { UserMentionItem } from './user-mention-item';

// TipTap mention suggestion list component
const MentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: React.KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        props.command({ id: props.items[selectedIndex].id, label: props.items[selectedIndex].name });
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className="z-50 p-2 bg-background border border-border rounded-md shadow-lg">
      {props.items.map((item: User, index: number) => (
        <div
          key={index}
          className={`p-2 rounded-md cursor-pointer ${index === selectedIndex ? 'bg-muted' : ''}`}
          onClick={() => props.command({ id: item.id, label: item.name })}
        >
          <UserMentionItem name={item.name} avatarUrl={item.avatarUrl} />
        </div>
      ))}
    </div>
  );
});
MentionList.displayName = 'MentionList';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  users?: User[];
}

export function MarkdownEditor({ value, onChange, placeholder, className, users = [] }: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Markdown.configure({
        html: false,
        transformCopiedText: true,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        renderLabel({ options, node }) {
          return `@${node.attrs.label ?? node.attrs.id}`
        },
        suggestion: {
          items: (query: string) => users.filter(user => user.name.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5),
          render: () => {
            let reactRenderer: ReactRenderer<any>;
            let popup: any;

            return {
              onStart: (props: any) => {
                reactRenderer = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: reactRenderer.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate(props: any) {
                reactRenderer.updateProps(props);
                popup[0].setProps({ getReferenceClientRect: props.clientRect });
              },
              onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }
                return reactRenderer.ref?.onKeyDown(props);
              },
              onExit() {
                popup[0].destroy();
                reactRenderer.destroy();
              },
            };
          },
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: `prose dark:prose-invert min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`,
      },
    },
  });

  const formattingTools = [
    { action: () => editor?.chain().focus().toggleBold().run(), icon: Bold, tooltip: 'Bold' },
    { action: () => editor?.chain().focus().toggleItalic().run(), icon: Italic, tooltip: 'Italic' },
    { action: () => editor?.chain().focus().toggleCode().run(), icon: Code, tooltip: 'Code' },
    { action: () => { const url = window.prompt('URL'); if (url) editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); }, icon: LinkIcon, tooltip: 'Link' },
    { action: () => editor?.chain().focus().toggleBulletList().run(), icon: List, tooltip: 'List' },
    { action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), icon: Heading, tooltip: 'Heading' },
  ] as const;

  useEffect(() => {
    if (editor && value !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <Tabs defaultValue="write" className="w-full">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-1 pr-1">
          {formattingTools.map((tool, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" onClick={tool.action}>
                  <tool.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{tool.tooltip}</p></TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
      <TabsContent value="write">
        <EditorContent editor={editor} />
      </TabsContent>
      <TabsContent value="preview">
        <div className="rounded-md border border-input p-4 min-h-[220px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {value || "Nothing to preview."}
          </ReactMarkdown>
        </div>
      </TabsContent>
    </Tabs>
  );
}
