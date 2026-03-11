"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownPreviewProps = {
  markdown: string;
  emptyLabel?: string;
};

export function MarkdownPreview({
  markdown,
  emptyLabel = "这里会实时渲染 Markdown 预览",
}: MarkdownPreviewProps) {
  if (!markdown.trim()) {
    return <div className="empty-preview">{emptyLabel}</div>;
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          a: ({ children, ...props }) => (
            <a className="md-link" rel="noreferrer" target="_blank" {...props}>
              {children}
            </a>
          ),
          pre: ({ children }) => <pre className="md-pre">{children}</pre>,
          code: ({ children, className, ...props }) => {
            const isBlock = Boolean(className);

            return (
              <code
                className={isBlock ? "md-code-block" : "md-inline-code"}
                {...props}
              >
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => <blockquote className="md-quote">{children}</blockquote>,
          hr: () => <hr className="md-rule" />,
          table: ({ children }) => (
            <div className="md-table-wrap">
              <table>{children}</table>
            </div>
          ),
        }}
        remarkPlugins={[remarkGfm]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
