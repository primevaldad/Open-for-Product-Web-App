'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
}

export default function Markdown({ content }: MarkdownProps) {
  return (
    <div className="prose dark:prose-invert max-w-none">
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
            {content}
        </ReactMarkdown>
    </div>
  );
}
