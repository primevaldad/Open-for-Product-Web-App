'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownProps {
  content: string;
  steemFlavor?: boolean;
}

export default function Markdown({ content, steemFlavor = false }: MarkdownProps) {
  return (
    <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={steemFlavor ? [rehypeRaw] : []}
            components={{
                a: ({node, ...props}) => {
                    if (props.href && (props.href.startsWith('http') || props.href.startsWith('https'))) {
                        return <a {...props} target="_blank" rel="noopener noreferrer" />
                    }
                    return <a {...props} />
                }
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
  );
}
