import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Shrinks its content (letting it reflow wider) until it fits the available box without scrolling. */
export function FitToScreen({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      let s = 1;
      for (let k = 0; k < 6; k++) {
        i.style.width = `${o.clientWidth / s}px`;
        const next = Math.min(1, o.clientHeight / Math.max(1, i.scrollHeight), (o.clientWidth / Math.max(1, i.scrollWidth)) * s);
        if (Math.abs(next - s) < 0.01) { s = next; break; }
        s = next;
      }
      i.style.width = `${o.clientWidth / s}px`;
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="relative h-full w-full overflow-hidden">
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}
