"use client";

import { useRef } from "react";

type Option = { value: string; label: string };

/** Adapted from 21st's Segmented Control (ddoemonn): a sliding thumb and
    roving arrow keys, without a motion library. */
export function SegmentedControl({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string;
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const count = Math.max(1, options.length);

  function go(next: number) {
    const option = options[next];
    if (!option) return;
    buttons.current[next]?.focus();
    onValueChange(option.value);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative grid rounded-[10px] bg-elevated p-[3px]"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] rounded-[7px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          width: `calc((100% - 6px) / ${count})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option, i) => (
        <button
          key={option.value}
          ref={(node) => {
            buttons.current[i] = node;
          }}
          type="button"
          role="tab"
          aria-selected={i === index}
          tabIndex={i === index ? 0 : -1}
          onClick={() => onValueChange(option.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
              event.preventDefault();
              go((i + 1) % count);
            } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
              event.preventDefault();
              go((i - 1 + count) % count);
            } else if (event.key === "Home") {
              event.preventDefault();
              go(0);
            } else if (event.key === "End") {
              event.preventDefault();
              go(count - 1);
            }
          }}
          className={`relative z-10 h-8 cursor-pointer rounded-[7px] px-2 text-[13px] font-medium tracking-[-0.01em] ${
            i === index ? "text-paper" : "text-muted hover:text-paper"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
