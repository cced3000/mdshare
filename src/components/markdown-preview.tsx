"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

type MarkdownPreviewProps = {
  markdown: string;
  emptyLabel?: string;
  copyable?: boolean;
};

function extractNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractNodeText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractNodeText(node.props.children);
  }

  return "";
}

function buildResponsiveTable(children: ReactNode) {
  let headers: string[] = [];

  const enhancedSections = Children.toArray(children).map((sectionNode) => {
    if (!isValidElement<{ children?: ReactNode }>(sectionNode)) {
      return sectionNode;
    }

    if (sectionNode.type === "thead") {
      const rows = Children.toArray(sectionNode.props.children);
      const firstRow = rows.find((rowNode) => isValidElement(rowNode) && rowNode.type === "tr");

      if (isValidElement<{ children?: ReactNode }>(firstRow)) {
        headers = Children.toArray(firstRow.props.children).map((cellNode) =>
          extractNodeText(cellNode).trim(),
        );
      }

      return sectionNode;
    }

    if (sectionNode.type !== "tbody" || headers.length === 0) {
      return sectionNode;
    }

    const enhancedRows = Children.map(sectionNode.props.children, (rowNode) => {
      if (!isValidElement<{ children?: ReactNode }>(rowNode) || rowNode.type !== "tr") {
        return rowNode;
      }

      const enhancedCells = Children.map(rowNode.props.children, (cellNode, index) => {
        if (!isValidElement<{ children?: ReactNode; ["data-label"]?: string }>(cellNode)) {
          return cellNode;
        }

        if (cellNode.type !== "td") {
          return cellNode;
        }

        return cloneElement(
          cellNode as ReactElement<{ children?: ReactNode; ["data-label"]?: string }>,
          {
            "data-label": headers[index] ?? "",
          },
        );
      });

      return cloneElement(
        rowNode as ReactElement<{ children?: ReactNode }>,
        undefined,
        enhancedCells,
      );
    });

    return cloneElement(
      sectionNode as ReactElement<{ children?: ReactNode }>,
      undefined,
      enhancedRows,
    );
  });

  return {
    enhancedSections,
    hasHeaders: headers.length > 0,
  };
}

function sanitizePreviewHtml(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;
  const elements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];

  for (const element of elements) {
    element.removeAttribute("class");
    element.removeAttribute("style");
    element.removeAttribute("data-state");
    element.removeAttribute("aria-hidden");
  }

  return clone.innerHTML.trim();
}

export function MarkdownPreview({
  markdown,
  emptyLabel = "这里会实时渲染 Markdown 预览",
  copyable = false,
}: MarkdownPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopyPreview() {
    if (!previewRef.current) {
      return;
    }

    const text = previewRef.current.innerText.trim();
    const html = sanitizePreviewHtml(previewRef.current);

    if (!text) {
      return;
    }

    if (
      typeof navigator !== "undefined" &&
      "clipboard" in navigator &&
      typeof navigator.clipboard.write === "function" &&
      typeof ClipboardItem !== "undefined"
    ) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
    } else if (typeof navigator !== "undefined" && "clipboard" in navigator) {
      await navigator.clipboard.writeText(text);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!markdown.trim()) {
    return <div className="empty-preview">{emptyLabel}</div>;
  }

  function ResponsiveTable({ children }: { children?: ReactNode }) {
    const { enhancedSections, hasHeaders } = buildResponsiveTable(children);

    return (
      <div className={`md-table-wrap${hasHeaders ? " has-labels" : ""}`}>
        <table>{enhancedSections}</table>
      </div>
    );
  }

  return (
    <div className="markdown-preview-surface">
      {copyable ? (
        <div className="markdown-preview-actions">
          <button
            aria-label="复制预览内容"
            className="preview-copy-button"
            onClick={() => void handleCopyPreview()}
            type="button"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "已复制" : "复制"}</span>
          </button>
        </div>
      ) : null}

      <div ref={previewRef} className="markdown-body">
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
            table: ({ children }) => <ResponsiveTable>{children}</ResponsiveTable>,
          }}
          remarkPlugins={[remarkGfm]}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
