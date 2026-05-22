'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownProps {
  content: string;
  steemFlavor?: boolean;
}

export default function Markdown({ content, steemFlavor = false }: MarkdownProps) {
  // Convert @mentions to clickable links (user/profile) using simple regex
  const mentionLink = (text: string) => {
    return text.replace(/@([\w-]+)/g, (match, handle) => {
      // Assuming user profile routes are /profile/[handle]
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
                a: ({node, ...props}) => {
                    let href = props.href;
                    // If href doesn't have a protocol, isn't a relative path, hash, or mailto, assume it's an external link
                    if (href && !/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                        href = `https://${href}`;
                    }
                    
                    if (href && (href.startsWith('http') || href.startsWith('https'))) {
                        return <a {...props} href={href} target="_blank" rel="noopener noreferrer" />
                    }
                    return <a {...props} href={href} />
                }
            }}
        >
            {processedContent}
        </ReactMarkdown>
    </div>
  );
}
