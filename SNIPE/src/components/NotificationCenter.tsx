import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "../lib/types";
import { allNotifs, markAllRead, readIds, timeAgo, unreadCount, type Notif, type NotifKind } from "../lib/notifs";
import { OWNER_PHONE, subStatus } from "../lib/engine";
import { useNow } from "./ui";
import { ArrowRight, BellIcon, BoltIcon, CheckIcon, InfoIcon, ShieldIcon, WalletIcon } from "./icons";

const KIND_META: Record<NotifKind, { color: string; Icon: typeof InfoIcon }> = {
  info: { color: "#c9ac5b", Icon: InfoIcon },
  ok: { color: "#2e9e63", Icon: CheckIcon },
  warn: { color: "#9c7b25", Icon: WalletIcon },
  err: { color: "#e0453a", Icon: BoltIcon },
};

export function NotificationCenter({ user, onRenew }: { user: User; onRenew: () => void }) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  const notifs = useMemo(() => allNotifs(user, now), [user, now, version]);
  const unread = useMemo(() => unreadCount(user, now), [user, now, version]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setTimeout(() => {
        markAllRead(user.phone, allNotifs(user, Date.now()).map((n) => n.id));
        setVersion((v) => v + 1);
      }, 600);
    }
  };

  const needsRenew = (() => {
    if (user.phone === OWNER_PHONE || user.vip || user.blocked) return false;
    const st = subStatus(user, now);
    return st.kind === "expired" || (st.kind === "active" && st.msLeft < 24 * 3600000) || (st.kind === "trial" && st.msLeft < 15 * 60000);
  })();

  return (
    <div className="relative" ref={wrap}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className={`relative grid place-items-center w-10 h-10 border transition-all duration-200 active:scale-95 border-ink/15 text-ink-soft hover:text-gold-deep hover:border-gold ${
          unread > 0 ? "border-gold" : ""
        }`}
      >
        <BellIcon size={17} className={unread > 0 ? "av-shake" : ""} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-gold text-paper font-mono text-[9px] font-semibold num shadow-md">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[70] md:hidden bg-ink/50 fadein" onClick={() => setOpen(false)} />
          <div className="rise absolute z-[75] mt-3 right-0 w-[min(92vw,380px)] bg-paper text-ink border border-ink/15 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-gold-soft">
                Alertes IA Snipe
              </p>
              <span className="font-mono text-[9px] text-ink-faint num">{notifs.length} message{notifs.length > 1 ? "s" : ""}</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-ink/8">
              {notifs.length === 0 && (
                <p className="px-4 py-8 text-center text-[13px] text-ink-faint">Aucune notification.</p>
              )}
              {notifs.map((n: Notif) => {
                const meta = KIND_META[n.kind];
                return (
                  <div key={n.id} className="flex gap-3 px-4 py-3.5 hover:bg-gold-pale/25 transition-colors">
                    <span className="mt-0.5 grid place-items-center w-7 h-7 shrink-0 rounded-full" style={{ background: `${meta.color}1f`, color: meta.color }}>
                      <meta.Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold truncate">{n.title}</p>
                        <span className="font-mono text-[9px] text-ink-faint shrink-0">{timeAgo(n.ts, now)}</span>
                      </div>
                      <p className="text-[12px] text-ink-soft leading-snug mt-0.5">{n.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {needsRenew && (
              <div className="px-4 py-3 border-t border-ink/10 bg-gold-pale/40">
                <button
                  onClick={() => {
                    setOpen(false);
                    onRenew();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gold text-paper py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] hover:bg-gold-deep transition-colors"
                >
                  Renouveler mon abonnement <ArrowRight size={11} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function fmtShort(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

/** Bandeau d'alerte urgent en haut de la page. */
export function SubBanner({ user, onRenew }: { user: User; onRenew: () => void }) {
  const now = useNow();
  const st = subStatus(user, now);
  if (user.phone === OWNER_PHONE || user.vip) return null;

  let msg: { kind: NotifKind; text: string } | null = null;
  if (user.blocked)
    msg = { kind: "err", text: "Compte suspendu par l'administrateur — régularisez votre abonnement pour réactiver l'accès." };
  else if (st.kind === "expired")
    msg = { kind: "err", text: "Accès expiré — renouvelez une offre (Mvola / Airtel) pour relancer analyses et prédictions." };
  else if (st.kind === "active" && st.msLeft < 24 * 3600000)
    msg = { kind: "warn", text: `Abonnement bientôt expiré — reste ${fmtShort(st.msLeft)}. Renouvelez maintenant.` };
  else if (st.kind === "trial" && st.msLeft < 15 * 60000)
    msg = { kind: "warn", text: `Essai gratuit presque terminé — reste ${fmtShort(st.msLeft)}.` };
  if (!msg) return null;

  const meta = KIND_META[msg.kind];
  return (
    <div
      className="rise flex items-center gap-3 px-4 py-2.5 border mb-6"
      style={{ borderColor: `${meta.color}66`, background: `${meta.color}14` }}
    >
      <span className="w-2 h-2 rounded-full pulse-dot shrink-0" style={{ background: meta.color }} />
      <p className="flex-1 text-[12.5px] font-medium leading-snug">{msg.text}</p>
      {!user.blocked && (
        <button
          onClick={onRenew}
          className="shrink-0 flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] font-semibold hover:bg-ink hover:text-paper transition-all"
          style={{ borderColor: `${meta.color}88`, color: meta.color }}
        >
          <ShieldIcon size={12} /> Renouveler
        </button>
      )}
    </div>
  );
}
