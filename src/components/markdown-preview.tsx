"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { getHtmlLang } from "@/lib/i18n";
import { optimizeChineseTypography } from "@/lib/utils";

type MarkdownPreviewProps = {
  markdown: string;
  emptyLabel?: string;
  copyable?: boolean;
  copyLabel?: string;
};

const TYPOGRAPHY_SKIP_TAGS = new Set([
  "A",
  "BUTTON",
  "CODE",
  "INPUT",
  "KBD",
  "OPTION",
  "PRE",
  "SAMP",
  "SELECT",
  "STYLE",
  "SCRIPT",
  "TEXTAREA",
]);

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

function shouldOptimizeTextNode(root: HTMLElement, node: Text) {
  const content = node.textContent ?? "";
  if (!content.trim()) {
    return false;
  }

  let parent = node.parentElement;
  while (parent) {
    if (TYPOGRAPHY_SKIP_TAGS.has(parent.tagName)) {
      return false;
    }

    if (parent === root) {
      break;
    }

    parent = parent.parentElement;
  }

  return true;
}

function optimizePreviewTypography(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const pendingNodes: Text[] = [];

  while (walker.nextNode()) {
    const currentNode = walker.currentNode;
    if (currentNode instanceof Text && shouldOptimizeTextNode(root, currentNode)) {
      pendingNodes.push(currentNode);
    }
  }

  for (const textNode of pendingNodes) {
    const nextText = optimizeChineseTypography(textNode.textContent ?? "");
    if (nextText !== textNode.textContent) {
      textNode.textContent = nextText;
    }
  }
}

export function MarkdownPreview({
  markdown,
  emptyLabel,
  copyable = false,
  copyLabel,
}: MarkdownPreviewProps) {
  const { language, t } = useI18n();
  const previewRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const resolvedEmptyLabel = emptyLabel ?? t("markdown.emptyPreview");
  const resolvedCopyLabel = copyLabel ?? t("common.copyTypography");

  useLayoutEffect(() => {
    if (!previewRef.current) {
      return;
    }

    optimizePreviewTypography(previewRef.current);
  }, [markdown]);

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
    return <div className="empty-preview">{resolvedEmptyLabel}</div>;
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
            aria-label={resolvedCopyLabel}
            className="preview-copy-button"
            onClick={() => void handleCopyPreview()}
            type="button"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? t("common.copied") : resolvedCopyLabel}</span>
          </button>
        </div>
      ) : null}

      <div ref={previewRef} className="markdown-body" lang={getHtmlLang(language)}>
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
