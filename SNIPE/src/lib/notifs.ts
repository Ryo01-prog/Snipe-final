import type { User } from "./types";
import { fmtAr, fmtCountdown, fmtDate, OWNER_PHONE, subStatus, uid } from "./engine";

export type NotifKind = "info" | "ok" | "warn" | "err";

export interface Notif {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  /** 0 = notification "en direct" (recalculée à chaque affichage) */
  ts: number;
}

const EVENTS_KEY = "snipe.notifs.events.v1";
const READ_KEY = "snipe.notifs.read.v1";

type EventsMap = Record<string, Notif[]>;
type ReadMap = Record<string, string[]>;

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function timeAgo(ts: number, now = Date.now()): string {
  if (ts === 0) return "en direct";
  const d = Math.max(0, now - ts);
  const min = Math.floor(d / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return fmtDate(ts);
}

/** Enregistre un événement persistant (dédupliqué par id). */
export function pushEvent(
  phone: string,
  kind: NotifKind,
  title: string,
  body: string,
  id = uid()
) {
  const map = readJSON<EventsMap>(EVENTS_KEY) ?? {};
  const list = map[phone] ?? [];
  if (list.some((n) => n.id === id)) return;
  map[phone] = [{ id, kind, title, body, ts: Date.now() }, ...list].slice(0, 14);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(map));
}

function events(phone: string): Notif[] {
  return (readJSON<EventsMap>(EVENTS_KEY) ?? {})[phone] ?? [];
}

/** Alertes IA dérivées de l'état du compte (tout ce qui touche à l'abonnement). */
export function derivedNotifs(user: User, now: number): Notif[] {
  const out: Notif[] = [];
  const st = subStatus(user, now);
  const day = new Date(now).toDateString();

  if (user.phone === OWNER_PHONE) {
    out.push({
      id: `owner-${day}`,
      kind: "info",
      title: "Compte fondateur",
      body: "Accès à vie : analyse, prédictions et console administrateur — aucune échéance.",
      ts: 0,
    });
    return out;
  }

  if (user.vip) {
    out.push({
      id: `vip-${day}`,
      kind: "ok",
      title: "Statut VIP actif",
      body: "Accès illimité accordé par l'administrateur — aucune échéance tant que le statut est maintenu.",
      ts: 0,
    });
    return out;
  }

  if (user.blocked) {
    out.push({
      id: "blocked",
      kind: "err",
      title: "Compte suspendu par l'administrateur",
      body: "Votre accès est bloqué en attendant la régularisation de votre abonnement. Contactez l'administrateur.",
      ts: 0,
    });
    return out;
  }

  out.push({
    id: `welcome-${day}`,
    kind: "info",
    title: "Point abonnement — IA Snipe",
    body:
      st.kind === "trial"
        ? `Il vous reste ${fmtCountdown(st.msLeft)} d'essai gratuit. Pensez à renouveler avant la fin.`
        : st.kind === "active"
          ? `Votre offre ${user.plan?.label} court encore ${fmtCountdown(st.msLeft)}. Tout est en ordre.`
          : "Votre accès est expiré — renouvelez une offre pour relancer les analyses et prédictions.",
    ts: 0,
  });

  if (st.kind === "trial" && st.msLeft < 15 * 60000) {
    out.push({
      id: "trial-soon",
      kind: "warn",
      title: "Essai gratuit presque terminé",
      body: `Encore ${fmtCountdown(st.msLeft)}. Renouvelez dès maintenant (dès ${fmtAr(4900, false)}) pour garder l'accès.`,
      ts: 0,
    });
  }
  if (st.kind === "active" && st.msLeft < 24 * 3600000) {
    out.push({
      id: "plan-soon",
      kind: "warn",
      title: "Abonnement bientôt expiré",
      body: `Il reste ${fmtCountdown(st.msLeft)} sur votre offre ${user.plan?.label}. Renouvelez pour rester couvert.`,
      ts: 0,
    });
  }
  if (st.kind === "expired") {
    out.push({
      id: "access-expired",
      kind: "err",
      title: "Accès expiré",
      body: "Renouvelez via Mvola ou Airtel pour relancer l'analyse et les 10 prédictions.",
      ts: 0,
    });
  }

  const pending = (user.pendingPayments ?? [])[0];
  if (pending) {
    out.push({
      id: `pending-${pending.id}`,
      kind: "warn",
      title: "Paiement en cours de validation",
      body: `Votre référence ${pending.ref} (${fmtAr(pending.amount, false)}) est en file de validation. Activation automatique dès confirmation.`,
      ts: 0,
    });
  }

  return out;
}

export function allNotifs(user: User, now: number): Notif[] {
  return [...derivedNotifs(user, now), ...events(user.phone)];
}

export function readIds(phone: string): string[] {
  return (readJSON<ReadMap>(READ_KEY) ?? {})[phone] ?? [];
}

export function markAllRead(phone: string, ids: string[]) {
  const map = readJSON<ReadMap>(READ_KEY) ?? {};
  map[phone] = Array.from(new Set([...(map[phone] ?? []), ...ids]));
  localStorage.setItem(READ_KEY, JSON.stringify(map));
}

export function unreadCount(user: User, now: number): number {
  const read = new Set(readIds(user.phone));
  return allNotifs(user, now).filter((n) => !read.has(n.id)).length;
}
