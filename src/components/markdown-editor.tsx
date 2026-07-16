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
  ChevronDown,
  FolderKanban
} from 'lucide-react';
import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { getMentionSuggestionsAction } from '@/app/actions/projects';
import { buildHybridUrl, extractId } from '@/lib/slug';

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
        if (props.items[selectedIndex]) {
          const item = props.items[selectedIndex];
          props.command({ id: item.id, label: item.name, mentionType: item.type, uid: item.uid });
          return true;
        }
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    // Show a friendly message instead of hiding the popup so users can type spaces without losing the list
    return (
      <div className="p-2 text-sm text-muted-foreground">No matches</div>
    );
  }

  return (
    <div className="z-50 p-2 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto min-w-[200px] flex flex-col gap-0.5">
      {props.items.map((item: any, index: number) => (
        <button
          type="button"
          key={index}
          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors w-full text-left outline-none border-none ${index === selectedIndex ? 'bg-muted' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); props.command({ id: item.id, label: item.name, mentionType: item.type, uid: item.uid }); }}
        >
          {item.type === 'project' ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
              <FolderKanban className="h-4 w-4" />
            </div>
          ) : (
            <Avatar className="h-8 w-8 shrink-0">
              {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.name} />}
              <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex flex-col text-left">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.name}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {item.type === 'project' ? 'Project' : `@${item.id}`}
            </span>
          </div>
        </button>
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
  const isUpdatingFromRaw = useRef(false);
  // For the uncontrolled raw textarea: store the current value and cursor position
  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rawCursorRef = useRef<{ start: number; end: number } | null>(null);

  // States to hold dynamically fetched users and projects
  const [fetchedUsers, setFetchedUsers] = useState<User[]>([]);
  const [fetchedProjects, setFetchedProjects] = useState<any[]>([]);

  // Ref to always hold latest users and projects for Tiptap Suggestion items function without rebuilding schema
  const suggestionsRef = useRef<{ users: User[]; projects: any[] }>({ users: [], projects: [] });

  useEffect(() => {
    async function loadSuggestions() {
      try {
        const res = await getMentionSuggestionsAction();
        console.log('[MarkdownEditor] Mention suggestions response:', res);
        if (res.success) {
          if (res.users) setFetchedUsers(res.users);
          if (res.projects) setFetchedProjects(res.projects);
        } else {
          console.error('[MarkdownEditor] Error from server action:', res.error);
        }
      } catch (e) {
        console.error('[MarkdownEditor] Failed to load mention suggestions:', e);
      }
    }
    loadSuggestions();
  }, []);

  useEffect(() => {
    suggestionsRef.current = {
      users: users.length > 0 ? users : fetchedUsers,
      projects: fetchedProjects,
    };
  }, [users, fetchedUsers, fetchedProjects]);

  const mentionLink = (text: string) => {
    // Legacy support: convert bare @mentions (not inside a markdown link) to profile links.
    // New mentions serialize as [@Name](/profile/uid-slug), so this is only for old content.
    let processed = text.replace(/(?<!\[)@([\w-]+)/g, (match, handle) => {
      const href = `/profile/${handle}`;
      return `<a href="${href}" class="mention">@${handle}</a>`;
    });
    // Replace generic [mention] placeholders with a styled span (fallback)
    processed = processed.replace(/\[mention\]/g, () => {
      return `<span class="mention placeholder">@unknown</span>`;
    });
    return processed;
  };

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
    Mention.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          mentionType: { default: 'user', parseHTML: (el: HTMLElement) => el.getAttribute('data-mention-type') || 'user', renderHTML: (attrs: any) => ({ 'data-mention-type': attrs.mentionType }) },
          uid: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-uid'), renderHTML: (attrs: any) => attrs.uid ? { 'data-uid': attrs.uid } : {} },
          // Stores the exact href the user provided (path-only or full URL).
          // This lets edits made in the Markup tab survive the round-trip through Tiptap.
          href: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('href') || el.getAttribute('data-href') || null, renderHTML: (attrs: any) => attrs.href ? { 'data-href': attrs.href } : {} },
        };
      },
      parseHTML() {
        return [
          ...this.parent?.() || [],
          // Single flexible rule: matches <a> tags whose href contains /projects/ or /profile/
          // anywhere in the path — handles both path-only (/projects/abc) and full URLs
          // (https://app.openforproduct.com/projects/abc).
          {
            tag: 'a',
            getAttrs: (node: string | HTMLElement) => {
              if (typeof node === 'string') return false;
              const text = node.textContent || '';
              if (!text.startsWith('@')) return false;

              const href = node.getAttribute('href') || '';
              const label = text.substring(1);

              // Project mention: href contains /projects/<slug>
              const projectMatch = href.match(/\/projects\/([^/?#\s)]+)/);
              if (projectMatch) {
                const slugPart = projectMatch[1];
                const id = extractId(slugPart);
                return { id, label, mentionType: 'project', href };
              }

              // User mention: href contains /profile/<slug>
              const profileMatch = href.match(/\/profile\/([^/?#\s)]+)/);
              if (profileMatch) {
                const slugPart = profileMatch[1];
                const uid = extractId(slugPart);
                const usernameSlug = slugPart.substring(uid.length + 1);
                return { id: usernameSlug || label, label, mentionType: 'user', uid, href };
              }

              return false;
            },
          },
        ];
      },
      // tiptap-markdown reads extension.storage.markdown.serialize to convert
      // a node back to a markdown string. Without this it falls back to `[mention]`.
      addStorage() {
        return {
          markdown: {
          serialize(state: any, node: any) {
              const label = node.attrs.label ?? node.attrs.id;
              const mType = node.attrs.mentionType || 'user';
              const id = node.attrs.id;

              // If the user manually edited the URL in the Markup tab, preserve it exactly.
              if (node.attrs.href) {
                state.write(`[@${label}](${node.attrs.href})`);
                return;
              }

              // Otherwise build the path-based URL (new mentions from the WYSIWYG picker).
              if (mType === 'project') {
                const href = buildHybridUrl('/projects', id, label);
                state.write(`[@${label}](${href})`);
              } else {
                // User: uid holds the Firebase UID, id holds the username
                const uid = node.attrs.uid || id;
                const href = buildHybridUrl('/profile', uid, id);
                state.write(`[@${label}](${href})`);
              }
            },
            parse: {},
          },
        };
      },
    }).configure({
      HTMLAttributes: { class: 'mention' },
      renderLabel({ node }) {
        return `@${node.attrs.label ?? node.attrs.id}`;
      },
      suggestion: {
        allowSpaces: true,
        items: ({ query }) => {
          // Trim whitespace so typing a space after a mention does not clear suggestions
          const trimmed = query.trim();
          const lowerQuery = trimmed.toLowerCase();
          const { users: currentUsers, projects: currentProjects } = suggestionsRef.current;
          
          const filteredUsers = currentUsers
            .filter(u => {
              const nameMatch = (u.name || '').toLowerCase().includes(lowerQuery);
              const usernameMatch = (u.username || '').toLowerCase().includes(lowerQuery);
              return nameMatch || usernameMatch;
            })
            .slice(0, 5)
            .map(u => ({
              id: u.username || u.id,
              name: u.name || 'Unknown User',
              avatarUrl: u.avatarUrl,
              type: 'user' as const,
              uid: u.id, // Firebase UID for hybrid URL
            }));

          const filteredProjects = currentProjects
            .filter(p => (p.name || '').toLowerCase().includes(lowerQuery))
            .slice(0, 5)
            .map(p => ({
              id: p.id,
              name: p.name || 'Unknown Project',
              avatarUrl: p.photoUrl,
              type: 'project' as const,
            }));

          // If query is empty (user just typed '@'), show top results
          if (trimmed === '') {
            return [...filteredUsers, ...filteredProjects];
          }

          return [...filteredUsers, ...filteredProjects];
        },
        render: () => {
          let reactRenderer: ReactRenderer<any>;
          let popup: any;

          return {
            onStart: (props: any) => {
              reactRenderer = new ReactRenderer(MentionList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => props.editor?.view?.dom?.closest('[role="dialog"]') || document.body,
                content: reactRenderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },
            onUpdate(props: any) {
              reactRenderer?.updateProps(props);

              if (!props.clientRect) {
                return;
              }

              popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide();
                return true;
              }
              const mentionListRef = reactRenderer?.ref as any;
              return mentionListRef?.onKeyDown(props);
            },
            onExit() {
              popup?.[0]?.destroy();
              reactRenderer?.destroy();
            },
          };
        },
      },
    }),
  ], [steemFlavor]);

  const [, forceUpdate] = useState(0);
  const [activeTab, setActiveTab] = useState<'write' | 'markup'>('write');

  const processedValue = useMemo(() => {
    if (!value) return value;
    // Pre-process markdown mention links into HTML <a> tags so Tiptap's parseHTML catches them.
    // Matches any [@Name](url) where the url contains /projects/ or /profile/ — handles:
    //   [@Name](/projects/abc)                              path-only
    //   [@Name](https://app.openforproduct.com/projects/abc)  full URL with scheme
    //   [@Name](app.openforproduct.com/projects/abc)        schemeless hostname
    return value.replace(
      /\[@([^\]]+)\]\(([^)]*\/(?:profile|projects)\/[^)]+)\)/g,
      (_, label, href) => `<a href="${href}">@${label}</a>`
    );
  }, [value]);

  const editor = useEditor({
    extensions,
    content: processedValue,
    // TipTap's markdown handling is provided by the Markdown extension; no need for contentType option.
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

  // Sync Tiptap from the textarea's value when switching back to Write tab.
  // Since the textarea is controlled, `value` / `processedValue` are always current.
  const handleTabChange = (tab: string) => {
    if (tab === 'write' && activeTab === 'markup' && editor) {
      editor.commands.setContent(processedValue ?? value);
    }
    setActiveTab(tab as 'write' | 'markup');
  };

  const formattingTools = [
    { name: 'bold', action: () => editor?.chain().focus().toggleBold().run(), icon: Bold, tooltip: 'Bold', shortcut: 'Mod+B' },
    { name: 'italic', action: () => editor?.chain().focus().toggleItalic().run(), icon: Italic, tooltip: 'Italic', shortcut: 'Mod+I' },
    { 
      name: 'code', 
      action: () => {
        if (!editor) return;
        const { state } = editor;
        const { from, to } = state.selection;
        const text = state.doc.textBetween(from, to, '\n');
        
        if (text.includes('\n')) {
          editor.chain().focus().toggleCodeBlock().run();
        } else {
          editor.chain().focus().toggleCode().run();
        }
      }, 
      icon: Code, 
      tooltip: 'Code Snippet', 
      shortcut: 'Mod+E' 
    },
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
    if (isUpdatingFromRaw.current) {
      // User is typing in the raw textarea — don't push back into Tiptap on every keystroke;
      // the Tiptap editor will sync when the user switches back to the Write tab.
      isUpdatingFromRaw.current = false;
      return;
    }
    if (editor) {
      // Retain the current selection if possible when updating externally
      const { from, to } = editor.state.selection;
      // Use processedValue (HTML form) so mention links survive the round-trip
      editor.commands.setContent(processedValue ?? value);
      try {
        editor.commands.setTextSelection({ from, to });
      } catch (e) {
        // Ignore selection restoration errors
      }
    }
  }, [value, editor, processedValue]);

  // After each render, restore the cursor position in the raw textarea.
  // This is needed because React's controlled textarea resets selectionStart/End on re-render.
  useLayoutEffect(() => {
    const ta = rawTextareaRef.current;
    if (!ta || !rawCursorRef.current) return;
    const { start, end } = rawCursorRef.current;
    ta.setSelectionRange(start, end);
    rawCursorRef.current = null;
  });

  const handleRawChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Save cursor position before React's re-render resets it
    rawCursorRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
    // Signal that this change came from the raw textarea so we skip the Tiptap re-sync
    isUpdatingFromRaw.current = true;
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
                variant={
                  (tool.name === 'code' 
                    ? (editor?.isActive('code') || editor?.isActive('codeBlock')) 
                    : editor?.isActive(tool.name)) 
                      ? "secondary" 
                      : "ghost"
                }
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between bg-muted/10 pr-1">
          <TabsList className="bg-transparent h-10">
            <TabsTrigger value="write" className="data-[state=active]:bg-background">Write</TabsTrigger>
            <TabsTrigger value="markup" className="data-[state=active]:bg-background">Markdown</TabsTrigger>
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
            ref={rawTextareaRef}
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



