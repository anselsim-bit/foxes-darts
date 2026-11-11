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
      const fits = (x: number) => {
        i.style.width = `${o.clientWidth / x}px`;
        return i.scrollHeight * x <= o.clientHeight + 1;
      };
      let s = 1;
      if (!fits(1)) {
        let lo = 0.15, hi = 1;
        for (let k = 0; k < 12; k++) {
          const mid = (lo + hi) / 2;
          if (fits(mid)) lo = mid; else hi = mid;
        }
        s = lo;
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
