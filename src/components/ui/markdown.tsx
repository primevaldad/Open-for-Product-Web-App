'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownProps {
  content: string;
  steemFlavor?: boolean;
}

export default function Markdown({ content, steemFlavor = false }: MarkdownProps) {
  // Legacy support: convert bare @mentions (not already inside a markdown link) to
  // simple profile links. New mentions from the editor are already serialized as
  // markdown links like [@Name](/profile/uid-slug), so this only catches old content.
  const mentionLink = (text: string) => {
    // Negative lookbehind for [ to avoid double-processing markdown links like [@Name](...)
    return text.replace(/(?<!\[)@([\w-]+)/g, (match, handle) => {
      const href = `/profile/${handle}`;
      return `<a href="${href}" class="mention">@${handle}</a>`;
    });
  };

  const processedContent = mentionLink(content);

  return (
    <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
                a: ({node, children, ...props}) => {
                    let href = props.href;
                    const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
                    
                    // Detect mention links: link text starts with @ and points to /profile/ or /projects/
                    const isMention = typeof text === 'string' && text.startsWith('@') && href && (href.startsWith('/profile/') || href.startsWith('/projects/'));
                    
                    if (isMention) {
                        return <a {...props} href={href} className="mention">{children}</a>;
                    }
                    
                    // If href doesn't have a protocol, isn't a relative path, hash, or mailto, assume it's an external link
                    if (href && !/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                        href = `https://${href}`;
                    }
                    
                    if (href && (href.startsWith('http') || href.startsWith('https'))) {
                        return <a {...props} href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                    }
                    return <a {...props} href={href}>{children}</a>
                }
            }}
        >
            {processedContent}
        </ReactMarkdown>
    </div>
  );
}
