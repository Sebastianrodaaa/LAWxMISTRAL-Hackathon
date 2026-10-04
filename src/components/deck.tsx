"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { flushSync } from "react-dom";
import type { Slide } from "@/lib/types";

export function Deck({ slides }: { slides: Slide[] }) {
  const mark = slides[0]?.title ?? "";
  const [index, setIndex] = useState(0);
  const [track, setTrack] = useState(mark);
  const [offset, setOffset] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const indexRef = useRef(0);
  const springRef = useRef(0);
  const dragRef = useRef<Drag | null>(null);

  if (track !== mark) {
    setTrack(mark);
    setIndex(0);
    indexRef.current = 0;
    offsetRef.current = 0;
    setOffset(0);
  }

  useEffect(() => {
    return () => cancelAnimationFrame(springRef.current);
  }, []);

  const goRef = useRef<(direction: -1 | 1) => void>(() => {});

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [role=tablist], [role=radiogroup]")) return;
      if (event.key === "ArrowRight") goRef.current(1);
      if (event.key === "ArrowLeft") goRef.current(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function setLive(next: number) {
    offsetRef.current = next;
    setOffset(next);
  }

  function settle(next: number) {
    flushSync(() => {
      indexRef.current = next;
      setIndex(next);
      setLive(0);
    });
  }

  function go(direction: -1 | 1) {
    const next = indexRef.current + direction;
    if (next < 0 || next >= slides.length) return;
    const width = frameRef.current?.clientWidth ?? 1;
    if (prefersReducedMotion()) {
      settle(next);
      return;
    }
    springTo(direction === 1 ? -width : width, direction * -600, () => settle(next));
  }

  function springTo(target: number, velocity: number, done?: () => void) {
    cancelAnimationFrame(springRef.current);
    let x = offsetRef.current;
    let v = velocity;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const stiffness = 280;
      const damping = 34;
      v += (-stiffness * (x - target) - damping * v) * dt;
      x += v * dt;
      setLive(x);
      if (Math.abs(x - target) < 1.5 && Math.abs(v) < 24) {
        setLive(target);
        springRef.current = 0;
        done?.();
        return;
      }
      springRef.current = requestAnimationFrame(step);
    };
    springRef.current = requestAnimationFrame(step);
  }

  goRef.current = go;

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;
    cancelAnimationFrame(springRef.current);
    dragRef.current = {
      pointerId: event.pointerId,
      origin: event.clientX - offsetRef.current,
      lastX: event.clientX,
      lastT: performance.now(),
      velocity: 0,
      active: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture needs a real pointer. Tracking still follows move events on the frame.
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const raw = event.clientX - drag.origin;
    if (!drag.active && Math.abs(raw - offsetRef.current) < 8 && Math.abs(event.clientX - drag.lastX) < 8) {
      return;
    }
    drag.active = true;
    const now = performance.now();
    const dt = Math.max(8, now - drag.lastT);
    drag.velocity = ((event.clientX - drag.lastX) / dt) * 1000;
    drag.lastX = event.clientX;
    drag.lastT = now;
    const width = frameRef.current?.clientWidth ?? 320;
    let x = raw;
    if (indexRef.current === 0 && x > 0) x = rubberband(x, width);
    if (indexRef.current === slides.length - 1 && x < 0) x = rubberband(x, width);
    setLive(x);
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.active) return;
    const width = frameRef.current?.clientWidth ?? 320;
    const projected = offsetRef.current + project(drag.velocity);
    let direction: -1 | 0 | 1 = 0;
    if (projected <= -72 && indexRef.current < slides.length - 1) direction = 1;
    else if (projected >= 72 && indexRef.current > 0) direction = -1;
    if (!direction) {
      if (prefersReducedMotion()) setLive(0);
      else springTo(0, drag.velocity);
      return;
    }
    const next = indexRef.current + direction;
    if (prefersReducedMotion()) {
      settle(next);
      return;
    }
    springTo(direction === 1 ? -width : width, drag.velocity, () => settle(next));
  }

  const slide = slides[index] ?? slides[0];
  if (!slide) return null;
  const previous = slides[index - 1];
  const upcoming = slides[index + 1];

  return (
    <section aria-label="Pitch deck">
      <div
        ref={frameRef}
        className="surface cursor-grab touch-pan-y select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div
          className="flex will-change-transform"
          style={{ width: "300%", transform: `translate3d(calc(-33.333333% + ${offset}px), 0, 0)` }}
        >
          <div className="w-1/3 shrink-0" aria-hidden="true">
            {previous ? <SlideFace slide={previous} /> : null}
          </div>
          <div className="w-1/3 shrink-0">
            <SlideFace slide={slide} />
          </div>
          <div className="w-1/3 shrink-0" aria-hidden="true">
            {upcoming ? <SlideFace slide={upcoming} /> : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint" aria-live="polite">
          Slide {index + 1} / {slides.length}
          <span className="hidden sm:inline"> · Drag or arrow keys</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="h-11 cursor-pointer rounded-xl bg-elevated px-3 text-sm font-medium text-paper transition-colors duration-200 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === slides.length - 1}
            className="h-11 cursor-pointer rounded-xl bg-elevated px-3 text-sm font-medium text-paper transition-colors duration-200 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function SlideFace({ slide }: { slide: Slide }) {
  return (
    <div className="flex min-h-[28rem] flex-col p-6 md:aspect-video md:min-h-0 md:p-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">{slide.kicker}</p>
      <div className="mt-6 grid flex-1 gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <h2 className="max-w-3xl font-serif text-3xl leading-[1.05] text-paper md:text-5xl">{slide.title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{slide.body}</p>
          {slide.bullets?.length ? (
            <ul className="mt-5 space-y-2 text-sm leading-relaxed text-paper">
              {slide.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3">
                  <span className="mt-2 h-px w-4 shrink-0 bg-gold" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {slide.stat ? (
          <div className="border-t border-line pt-4 md:border-t-0 md:border-l md:pl-6 md:pt-0">
            <p className="font-serif text-4xl text-gold tabular-nums">{slide.stat.value}</p>
            <p className="mt-1 max-w-40 text-xs uppercase tracking-[0.14em] text-faint">{slide.stat.label}</p>
          </div>
        ) : null}
      </div>
      {slide.footnote ? <p className="mt-6 text-xs leading-relaxed text-faint">{slide.footnote}</p> : null}
    </div>
  );
}

type Drag = {
  pointerId: number;
  origin: number;
  lastX: number;
  lastT: number;
  velocity: number;
  active: boolean;
};

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function project(velocity: number, deceleration = 0.998) {
  return (velocity / 1000) * (deceleration / (1 - deceleration));
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
