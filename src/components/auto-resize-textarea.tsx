"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

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
  const [focused, setFocused] = useState(false);

  const syncTextareaMetrics = useCallback(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    node.style.height = "0px";
    node.style.height = `${node.scrollHeight}px`;

    const computedStyle = window.getComputedStyle(node);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 33;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const selectionStart = node.selectionStart ?? 0;
    const activeLineIndex = node.value.slice(0, selectionStart).split("\n").length - 1;
    const activeLineTop = paddingTop + activeLineIndex * lineHeight;

    node.style.setProperty("--active-line-top", `${activeLineTop}px`);
    node.style.setProperty("--active-line-bottom", `${activeLineTop + lineHeight}px`);
  }, []);

  useLayoutEffect(() => {
    syncTextareaMetrics();
  }, [focused, syncTextareaMetrics, value]);

  return (
    <textarea
      className={className}
      data-focused={focused ? "true" : "false"}
      onChange={(event) => onChange(event.target.value)}
      onClick={syncTextareaMetrics}
      onFocus={() => setFocused(true)}
      onKeyUp={syncTextareaMetrics}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      ref={ref}
      onSelect={syncTextareaMetrics}
      spellCheck={spellCheck}
      value={value}
    />
  );
}
