"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

type AutoResizeTextareaProps = {
  className?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  spellCheck?: boolean;
  value: string;
};

export function AutoResizeTextarea({
  className,
  onChange,
  placeholder,
  spellCheck = false,
  value,
}: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const syncActiveLineMetrics = useCallback(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const computedStyle = window.getComputedStyle(node);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 33;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const selectionStart = node.selectionStart ?? 0;
    const activeLineIndex = node.value.slice(0, selectionStart).split("\n").length - 1;
    const activeLineTop = paddingTop + activeLineIndex * lineHeight;

    node.style.setProperty("--active-line-top", `${activeLineTop}px`);
    node.style.setProperty("--active-line-bottom", `${activeLineTop + lineHeight}px`);
  }, []);

  const syncTextareaHeight = useCallback(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const viewport = window;
    const { scrollX, scrollY } = viewport;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
    viewport.scrollTo(scrollX, scrollY);
  }, []);

  useLayoutEffect(() => {
    syncTextareaHeight();
    syncActiveLineMetrics();
  }, [syncActiveLineMetrics, syncTextareaHeight, value]);

  return (
    <textarea
      className={className}
      onChange={(event) => onChange(event.target.value)}
      onClick={syncActiveLineMetrics}
      onFocus={syncActiveLineMetrics}
      onKeyUp={syncActiveLineMetrics}
      placeholder={placeholder}
      ref={ref}
      onSelect={syncActiveLineMetrics}
      spellCheck={spellCheck}
      value={value}
    />
  );
}
