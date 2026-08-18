import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GameColor } from "../lib/types";
import { COLOR_META } from "../lib/engine";
import { CheckIcon, InfoIcon, XIcon, BoltIcon } from "./icons";

/* ------------------------------------------------------------------ */
/* Toasts                                                               */
/* ------------------------------------------------------------------ */

type ToastKind = "ok" | "err" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  msg: string;
}

const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function toast(msg: string, kind: ToastKind = "ok") {
  window.dispatchEvent(new CustomEvent("snipe:toast", { detail: { msg, kind } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const on = (e: Event) => {
      const { msg, kind } = (e as CustomEvent).detail as { msg: string; kind: ToastKind };
      const id = ++idRef.current;
      setItems((cur) => [...cur, { id, kind, msg }]);
      setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4200);
    };
    window.addEventListener("snipe:toast", on);
    return () => window.removeEventListener("snipe:toast", on);
  }, []);

  return (
    <ToastCtx.Provider value={(msg, kind = "ok") => toast(msg, kind)}>
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(92vw,420px)] pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className={`rise pointer-events-auto flex items-start gap-3 border px-4 py-3 shadow-xl backdrop-blur ${
              t.kind === "ok"
                ? "border-dgreen/50 bg-paper text-ink"
                : t.kind === "err"
                  ? "border-drouge/60 bg-paper text-ink"
                  : "border-gold/60 bg-paper text-ink"
            }`}
          >
            <span
              className={`mt-0.5 grid place-items-center w-6 h-6 shrink-0 rounded-full text-paper ${
                t.kind === "ok" ? "bg-dgreen" : t.kind === "err" ? "bg-drouge" : "bg-gold"
              }`}
            >
              {t.kind === "ok" ? <CheckIcon size={13} /> : t.kind === "err" ? <XIcon size={13} /> : <InfoIcon size={13} />}
            </span>
            <p className="text-[13px] leading-snug font-medium">{t.msg}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Bouton                                                               */
/* ------------------------------------------------------------------ */

export function Btn({
  variant = "ink",
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ink" | "gold" | "ghost" | "danger";
}) {
  const v = {
    ink: "bg-ink text-paper hover:bg-ink-soft border border-ink",
    gold: "bg-gold text-paper hover:bg-gold-deep border border-gold",
    ghost: "bg-transparent text-ink-soft hover:text-ink border border-ink/25 hover:border-ink",
    danger: "bg-transparent text-drouge border border-drouge/50 hover:bg-drouge hover:text-paper",
  }[variant];
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 font-semibold text-[13.5px] tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none ${v} ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Habillage visuel                                                     */
/* ------------------------------------------------------------------ */

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.26em] text-ink-faint flex items-center gap-3">
        <span className="inline-block w-6 h-px bg-gold" />
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Corners({ className = "" }: { className?: string }) {
  const c = `absolute w-2.5 h-2.5 border-current ${className}`;
  return (
    <>
      <span className={`${c} top-1.5 left-1.5 border-t border-l`} />
      <span className={`${c} top-1.5 right-1.5 border-t border-r`} />
      <span className={`${c} bottom-1.5 left-1.5 border-b border-l`} />
      <span className={`${c} bottom-1.5 right-1.5 border-b border-r`} />
    </>
  );
}

export function ColorDot({ color, size = 9 }: { color: GameColor; size?: number }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: COLOR_META[color].css }}
    />
  );
}

export function ColorChip({ color }: { color: GameColor }) {
  const m = COLOR_META[color];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-paper"
      style={{ background: m.css }}
    >
      {m.label}
      <span className="opacity-70">{m.band}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Hooks                                                                */
/* ------------------------------------------------------------------ */

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(target);
  const prevRef = useRef(target);
  const raf = useRef<number>(0);

  const animate = useCallback((from: number, to: number) => {
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (to - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [duration]);

  useEffect(() => {
    if (prevRef.current !== target) {
      animate(prevRef.current, target);
      prevRef.current = target;
    }
    return () => cancelAnimationFrame(raf.current);
  }, [target, animate]);

  return Math.round(val);
}

/* ------------------------------------------------------------------ */
/* Modale de confirmation                                               */
/* ------------------------------------------------------------------ */

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] bg-ink/60 backdrop-blur-[2px] grid place-items-center px-5" onClick={onClose}>
      <div
        className="rise relative max-w-md w-full bg-paper border border-ink/15 p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Corners className={danger ? "text-drouge border-drouge" : "text-gold border-gold"} />
        <span
          className={`inline-grid place-items-center w-11 h-11 rounded-full border mb-4 ${
            danger ? "border-drouge/50 text-drouge" : "border-gold/60 text-gold-deep"
          }`}
        >
          {danger ? <BoltIcon size={20} /> : <InfoIcon size={20} />}
        </span>
        <h3 className="font-display text-2xl font-semibold">{title}</h3>
        <div className="text-[14px] text-ink-soft leading-relaxed mt-2.5">{body}</div>
        <div className="flex justify-end gap-2.5 mt-7">
          <Btn variant="ghost" onClick={onClose}>
            Annuler
          </Btn>
          <Btn variant={danger ? "danger" : "ink"} onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
