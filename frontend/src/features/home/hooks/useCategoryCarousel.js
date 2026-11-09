import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const clamp = (value, max) => Math.max(0, Math.min(value, max));

/** Keep the reference's 55px initial crop while revealing keyboard-focused cards. */
export function useCategoryCarousel(resetSignal = 0, categoryCount = 0) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const [geometry, setGeometry] = useState({ position: null, max: 0, step: 0, unit: 1 });

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const first = track?.firstElementChild;
    if (!viewport || !track || !first) return;

    const width = first.getBoundingClientRect().width;
    const unit = width / 170;
    const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
    const max = Math.max(0, track.scrollWidth - viewport.clientWidth);
    setGeometry((previous) => ({
      position: clamp(previous.position === null ? 55 * unit : previous.position * unit / previous.unit, max),
      max,
      step: width + gap,
      unit,
    }));
  }, []);

  useLayoutEffect(() => {
    measure();
    const viewport = viewportRef.current;
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measure, categoryCount]);

  useLayoutEffect(() => {
    if (resetSignal > 0) setGeometry((previous) => ({ ...previous, position: 0 }));
  }, [resetSignal]);

  const move = useCallback((direction) => {
    setGeometry((previous) => ({
      ...previous,
      position: clamp((previous.position || 0) + direction * previous.step, previous.max),
    }));
  }, []);

  const reveal = useCallback((element) => {
    const viewport = viewportRef.current;
    if (!viewport || !element) return;
    // Native focus can scroll an overflow:hidden container; our transform owns its offset.
    viewport.scrollLeft = 0;
    const left = element.offsetLeft;
    const right = left + element.offsetWidth;
    setGeometry((previous) => {
      let position = previous.position || 0;
      if (left < position) position = left;
      if (right > position + viewport.clientWidth) position = right - viewport.clientWidth;
      return { ...previous, position: clamp(position, previous.max) };
    });
  }, []);

  return {
    viewportRef,
    trackRef,
    trackStyle: geometry.position === null ? undefined : { transform: `translateX(${-geometry.position}px)` },
    previousDisabled: geometry.position !== null && geometry.position <= 0.5,
    nextDisabled: geometry.position !== null && geometry.position >= geometry.max - 0.5,
    move,
    reveal,
  };
}
