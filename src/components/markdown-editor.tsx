import { 
  Bold, 
  Code, 
  Italic, 
  Link as LinkIcon, 
  List, 
  ListOrdered,
  Heading, 
  Quote, 
  Settings2,
  ChevronDown
} from 'lucide-react';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Editor, EditorContent, ReactRenderer, useEditor, InputRule } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Blockquote from '@tiptap/extension-blockquote';
import { Markdown } from 'tiptap-markdown';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import tippy from 'tippy.js';
import 'highlight.js/styles/github-dark.css';
import 'tippy.js/dist/tippy.css';

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';

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
        props.command({ id: props.items[selectedIndex].username || props.items[selectedIndex].id, label: props.items[selectedIndex].name });
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
          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${index === selectedIndex ? 'bg-muted' : ''}`}
          onClick={() => props.command({ id: item.username || item.id, label: item.name })}
        >
          <Avatar className="h-8 w-8">
            {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.name} />}
            <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{item.name}</span>
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
  steemFlavor?: boolean;
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  users = [],
  steemFlavor = false
}: MarkdownEditorProps) {
  const isUpdatingFromEditor = useRef(false);

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      blockquote: false, // Handle blockquote manually for custom input rules
    }),
    Blockquote.extend({
      addInputRules() {
        return [
          ...this.parent?.() || [],
          // Support custom "| " as a blockquote trigger
          new InputRule({
            find: /^\s*[|]\s$/,
            handler: ({ range, chain }) => {
              chain().deleteRange(range).setBlockquote().run();
            },
          }),
        ];
      },
    }),
    Markdown.configure({
      html: steemFlavor,
      transformCopiedText: true,
    }),
    Link.configure({ openOnClick: false, autolink: true }),
    Mention.configure({
      HTMLAttributes: { class: 'mention' },
      renderLabel({ node }) {
        return `@${node.attrs.label ?? node.attrs.id}`;
      },
      suggestion: {
        items: ({ query }: { query: string; editor: Editor; }) => 
          users.filter(user => user.name.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5),
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
              const mentionListRef = reactRenderer.ref as any;
              return mentionListRef?.onKeyDown(props);
            },
            onExit() {
              popup[0].destroy();
              reactRenderer.destroy();
            },
          };
        },
      },
    }),
  ], [steemFlavor, users]);

  const [, forceUpdate] = useState(0);

  const editor = useEditor({
    extensions,
    content: value,
    onUpdate: ({ editor }) => {
      isUpdatingFromEditor.current = true;
      const md = (editor.storage as any).markdown.getMarkdown();
      onChange(md);
    },
    onSelectionUpdate: () => forceUpdate(n => n + 1),
    editorProps: {
      attributes: {
        class: cn(
          "prose dark:prose-invert min-h-[300px] w-full bg-transparent px-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        ),
      },
    },
    immediatelyRender: false,
  });

  const formattingTools = [
    { name: 'bold', action: () => editor?.chain().focus().toggleBold().run(), icon: Bold, tooltip: 'Bold', shortcut: 'Mod+B' },
    { name: 'italic', action: () => editor?.chain().focus().toggleItalic().run(), icon: Italic, tooltip: 'Italic', shortcut: 'Mod+I' },
    { name: 'code', action: () => editor?.chain().focus().toggleCode().run(), icon: Code, tooltip: 'Code Snippet', shortcut: 'Mod+E' },
    { name: 'blockquote', action: () => editor?.chain().focus().toggleBlockquote().run(), icon: Quote, tooltip: 'Quote', shortcut: 'Mod+Shift+B' },
    { name: 'link', action: () => { 
      let url = window.prompt('URL'); 
      if (url) {
        if (!/^https?:\/\//i.test(url) && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:')) {
          url = `https://${url}`;
        }
        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); 
      }
    }, icon: LinkIcon, tooltip: 'Link', shortcut: 'Mod+K' },
    { name: 'bulletList', action: () => editor?.chain().focus().toggleBulletList().run(), icon: List, tooltip: 'Bullet List', shortcut: 'Mod+Shift+8' },
    { name: 'orderedList', action: () => editor?.chain().focus().toggleOrderedList().run(), icon: ListOrdered, tooltip: 'Numbered List', shortcut: 'Mod+Shift+7' },
  ] as const;

  const headerLevels = [1, 2, 3, 4];

  useEffect(() => {
    if (isUpdatingFromEditor.current) {
      isUpdatingFromEditor.current = false;
      return;
    }
    if (editor) {
      // Retain the current selection if possible when updating externally
      const { from, to } = editor.state.selection;
      editor.commands.setContent(value, { emitUpdate: false });
      try {
        editor.commands.setTextSelection({ from, to });
      } catch (e) {
        // Ignore selection restoration errors
      }
    }
  }, [value, editor]);

  const handleRawChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // We don't set isUpdatingFromEditor because we *want* the editor to sync from this value
    onChange(e.target.value);
  };

  const Toolbar = () => (
    <div className="flex items-center justify-between border-b p-1 bg-muted/20 sticky top-0 z-10">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {formattingTools.map((tool, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Button 
                type="button" 
                variant={editor?.isActive(tool.name) ? "secondary" : "ghost"} 
                size="icon" 
                className="h-8 w-8 shrink-0" 
                onClick={tool.action}
              >
                <tool.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col items-center">
                <span>{tool.tooltip}</span>
                <span className="text-[10px] text-muted-foreground">{tool.shortcut.replace('Mod', '⌘')}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 shrink-0">
                  <Heading className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Header Levels (⌘+Alt+1-4)</TooltipContent>
          </Tooltip>
          <DropdownMenuContent>
            {headerLevels.map(level => (
              <DropdownMenuItem 
                key={level} 
                onClick={() => editor?.chain().focus().toggleHeading({ level: level as any }).run()}
                className={cn(editor?.isActive('heading', { level }) ? "bg-accent" : "")}
              >
                Header {level}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full border rounded-md overflow-hidden bg-background">
      <Tabs defaultValue="write" className="flex-1 flex flex-col">
        <div className="flex items-center justify-between bg-muted/10 pr-1">
          <TabsList className="bg-transparent h-10">
            <TabsTrigger value="write" className="data-[state=active]:bg-background">Write</TabsTrigger>
            <TabsTrigger value="markup" className="data-[state=active]:bg-background">Markup</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="write" className="m-0 flex-1 data-[state=active]:flex flex-col min-h-[300px] outline-none">
          <Toolbar />
          <div className="flex-1 overflow-y-auto max-h-[500px]">
            <EditorContent editor={editor} />
          </div>
        </TabsContent>
        
        <TabsContent value="markup" className="m-0 flex-1 data-[state=active]:flex flex-col min-h-[300px] outline-none">
          <textarea
            value={value}
            onChange={handleRawChange}
            placeholder={placeholder || "Enter markdown here..."}
            className="flex-1 w-full p-4 bg-background text-foreground font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}



