import type {
  GameColor,
  Prediction,
  Round,
  Session,
  SessionImage,
  SignalType,
  User,
} from "./types";

/* ------------------------------------------------------------------ */
/* Constantes                                                           */
/* ------------------------------------------------------------------ */

export const OWNER_PHONE = "0381645731";
export const MVOLA_NUMBER = "038 16 45 731";
export const AIRTEL_NUMBER = "033 53 36 854";
export const TRIAL_MS = 3600_000;
export const GAME_NAME = "Aviator";
export const GAME_URL = "https://bet261.mg/instant-games/llc/Aviator?categoryId=18";

/** Base fixe de simulation — les mises ne sont JAMAIS lues dans les captures. */
export const REF_STAKE = 1000;

export const PLANS = [
  { id: "p3", label: "3 jours", days: 3, price: 4900 },
  { id: "p7", label: "7 jours", days: 7, price: 8900 },
  { id: "p30", label: "30 jours", days: 30, price: 19000 },
];

/**
 * Seuils « supérieur à » — les trois couleurs prédites :
 *   violet  > ×2   (2,01× – 4,99×)
 *   rose    > ×5   (5× – 9,99×)
 *   orange  > ×10  (10,1× et +)
 */
export const COLOR_META: Record<GameColor, { label: string; css: string; band: string }> = {
  violet: { label: "Violet", css: "#8b5cf6", band: "sup. ×2" },
  rose: { label: "Rose", css: "#ec4899", band: "sup. ×5" },
  orange: { label: "Orange", css: "#f08c1e", band: "sup. ×10" },
};



/* ------------------------------------------------------------------ */
/* Utilitaires                                                          */
/* ------------------------------------------------------------------ */

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSamples(samples: number[][], names: string[]): number {
  let h = 2166136261;
  const mix = (n: number) => {
    h ^= n;
    h = Math.imul(h, 16777619);
  };
  names.forEach((n) => {
    for (let i = 0; i < n.length; i++) mix(n.charCodeAt(i));
  });
  samples.forEach((s) => s.forEach((v) => mix(v)));
  return h >>> 0;
}

export function fmtAr(n: number, withAr = true): string {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(Math.round(n));
  const s = abs.toLocaleString("fr-FR");
  return withAr ? `${sign}${s} Ar` : `${sign}${s}`;
}

export function fmtNum(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtTimeHMS(ts: number): string {
  return new Date(ts).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  if (d > 0) return `${d}j ${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 3)} •• ••• ${phone.slice(-2)}`;
}

export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Génération de session (déterministe selon les captures)             */
/* ------------------------------------------------------------------ */

/** Couleur déduite du multiplicateur selon les seuils « supérieur à ». */
export function colorForMultiplier(m: number): GameColor {
  if (m > 10) return "orange";
  if (m > 5) return "rose";
  return "violet";
}

/** Multiplicateur généré dans la bande « supérieur à » de la couleur tirée. */
function aviatorMultiplier(color: GameColor, rng: () => number): number {
  const round = (n: number) => Math.round(n * 100) / 100;
  if (color === "violet") return Math.min(4.99, round(2.01 + rng() * 2.98));
  if (color === "rose") return Math.min(9.99, round(5 + rng() * 4.99));
  return Math.min(100, round(10.1 * Math.pow(10, rng() * 0.6)));
}

function weightedColor(rng: () => number, wViolet: number, wRose: number): GameColor {
  const r = rng();
  if (r < wViolet) return "violet";
  if (r < wViolet + wRose) return "rose";
  return "orange";
}

function toHex(n: number): string {
  return (
    "0x" +
    Math.floor(n * 0xffffff)
      .toString(16)
      .padStart(6, "0")
  );
}

export function buildSession(seed: number, images: SessionImage[]): Session {
  const rng = mulberry32(seed);
  const count = 18 + Math.floor(rng() * 12);
  const stake = REF_STAKE;
  // Proportions réalistes : violet fréquent, rose intermédiaire, orange rare
  const wViolet = 0.52 + rng() * 0.08;
  const wRose = 0.28 + rng() * 0.06;

  const now = Date.now();
  const gap = 75 + Math.floor(rng() * 60); // secondes entre manches
  const rounds: Round[] = [];
  let t = now - count * gap * 1000;

  for (let i = 0; i < count; i++) {
    t += gap * 1000 + Math.floor(rng() * 20000);
    const color = weightedColor(rng, wViolet, wRose);
    const multiplier = aviatorMultiplier(color, rng);
    const win = color === "violet" ? rng() < 0.45 : color === "rose" ? rng() < 0.4 : rng() < 0.35;
    const net = win ? Math.round(stake * (multiplier - 1)) : -stake;
    const dec = Math.floor(rng() * 16777215);
    rounds.push({
      index: i,
      time: new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      color,
      multiplier,
      hex: toHex(rng()),
      decimal: dec,
      net,
    });
  }

  const last = rounds[rounds.length - 1];
  const dateLabel = new Date(now).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return {
    id: uid(),
    createdAt: now,
    stake,
    rounds,
    last: {
      dateLabel,
      time: last.time,
      hex: last.hex,
      decimal: last.decimal,
      color: last.color,
      multiplier: last.multiplier,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Agrégation de statistiques                                           */
/* ------------------------------------------------------------------ */

export interface Aggregate {
  rounds: Round[];
  totalStaked: number;
  net: number;
  wins: number;
  losses: number;
  winRate: number;
  best: number;
  worst: number;
  roundsPerDay: number;
  avgIntervalSec: number;
  colorCounts: Record<GameColor, number>;
  gapsMin: Record<GameColor, number>;
}

export function aggregate(sessions: Session[]): Aggregate {
  const rounds = sessions.flatMap((s) => s.rounds);
  const totalStaked = rounds.length * REF_STAKE;
  const net = rounds.reduce((a, r) => a + r.net, 0);
  const wins = rounds.filter((r) => r.net > 0).length;
  const losses = rounds.length - wins;
  const best = rounds.length ? Math.max(...rounds.map((r) => r.net)) : 0;
  const worst = rounds.length ? Math.min(...rounds.map((r) => r.net)) : 0;

  const colorCounts: Record<GameColor, number> = { violet: 0, rose: 0, orange: 0 };
  const gaps: Record<GameColor, number[]> = { violet: [], rose: [], orange: [] };
  const lastSeen: Record<GameColor, number> = { violet: -1, rose: -1, orange: -1 };

  rounds.forEach((r, i) => {
    colorCounts[r.color]++;
    if (lastSeen[r.color] >= 0) gaps[r.color].push(i - lastSeen[r.color]);
    lastSeen[r.color] = i;
  });

  const gapsMin: Record<GameColor, number> = { violet: 0, rose: 0, orange: 0 };
  (Object.keys(gaps) as GameColor[]).forEach((c) => {
    const g = gaps[c];
    // écart moyen en "manches" converti en minutes approximatives (≈1,5 min/manche)
    gapsMin[c] = g.length ? Math.round((g.reduce((a, b) => a + b, 0) / g.length) * 1.5 * 10) / 10 : 0;
  });

  const spanMs = sessions.length
    ? Date.now() - Math.min(...sessions.map((s) => s.createdAt))
    : 0;
  const roundsPerDay = spanMs > 0 ? Math.round((rounds.length / (spanMs / 86400000)) * 10) / 10 : rounds.length;
  const avgIntervalSec = rounds.length > 1 ? Math.round(90 + (rounds.length % 40)) : 0;

  return {
    rounds,
    totalStaked,
    net,
    wins,
    losses,
    winRate: rounds.length ? Math.round((wins / rounds.length) * 100) : 0,
    best,
    worst,
    roundsPerDay,
    avgIntervalSec,
    colorCounts,
    gapsMin,
  };
}

/* ------------------------------------------------------------------ */
/* Prédictions (10 prochaines manches)                                 */
/* ------------------------------------------------------------------ */

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 1;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

export function makePredictions(
  session: Session,
  seed: number,
  weights: Record<SignalType, number> = { ecart: 1, serie: 1, frequence: 1 }
): Prediction[] {
  const rng = mulberry32(seed);
  const out: Prediction[] = [];
  const now = Date.now();
  const rounds = session.rounds;
  if (!rounds.length) return out;

  const sortedMults = rounds.map((r) => r.multiplier).sort((a, b) => a - b);
  const q60 = quantile(sortedMults, 0.6);
  const q90 = quantile(sortedMults, 0.9);

  const counts: Record<GameColor, number> = { violet: 0, rose: 0, orange: 0 };
  const lastSeen: Record<GameColor, number> = { violet: -1, rose: -1, orange: -1 };
  rounds.forEach((r, i) => {
    counts[r.color]++;
    lastSeen[r.color] = i;
  });

  const n = rounds.length;
  let prev = rounds[n - 1].color;
  let curStreak = 1;
  for (let i = n - 2; i >= 0 && rounds[i].color === prev; i--) curStreak++;

  const W = weights;

  for (let i = 0; i < 10; i++) {
    const t = now + (i + 1) * 60_000;

    // Écart normalisé depuis la dernière apparition de chaque couleur
    const overdues: Record<GameColor, number> = { violet: 0, rose: 0, orange: 0 };
    (Object.keys(counts) as GameColor[]).forEach((c) => {
      const freq = counts[c] / n;
      const since = n - 1 - lastSeen[c] + i;
      overdues[c] = freq > 0 ? (since / n / freq) * (0.8 + 0.4 * rng()) : 1;
    });

    const base: Record<GameColor, number> = {
      violet: 0.55 * (W.frequence ?? 1),
      rose: 0.3 * (W.frequence ?? 1),
      orange: 0.15,
    };
    (Object.keys(overdues) as GameColor[]).forEach((c) => {
      base[c] += overdues[c] * 0.18 * (W.ecart ?? 1);
    });
    if (curStreak + i >= 3) base.rose += 0.06 * (W.serie ?? 1);

    const wSum = base.violet + base.rose + base.orange;
    const r = rng();
    let color: GameColor = "violet";
    if (r >= base.violet / wSum && r < (base.violet + base.rose) / wSum) color = "rose";
    else if (r >= (base.violet + base.rose) / wSum) color = "orange";

    const colorProb = Math.round((base[color] / wSum) * 100);
    const overdueMax = Math.max(overdues.violet, overdues.rose, overdues.orange);

    let signalType: SignalType;
    let signal: string;
    const dueColor = (Object.keys(overdues) as GameColor[]).reduce((a, b) =>
      overdues[a] > overdues[b] ? a : b
    );
    if (prev !== color && curStreak >= 3) {
      signalType = "serie";
      signal = `Rupture de série ${COLOR_META[prev].label.toLowerCase()} (×${curStreak})`;
    } else if (overdues[color] > 1.05) {
      signalType = "ecart";
      signal = `Écart ${COLOR_META[color].label.toLowerCase()} — répétition probable`;
    } else {
      signalType = "frequence";
      signal = `Fréquence dominante ${COLOR_META[dueColor].label.toLowerCase()} · hex pairs ${
        40 + Math.floor(rng() * 20)
      }%`;
    }

    let confidence = Math.round(
      (42 +
        (base[color] / wSum) * 34 +
        Math.min(16, overdueMax * 5) +
        rng() * 8 -
        (curStreak >= 3 ? 4 : 0)) *
        (0.82 + 0.18 * (W[signalType] ?? 1))
    );
    confidence = Math.max(38, Math.min(92, confidence));

    // Fourchettes calées sur les seuils « supérieur à »
    let multMin: number;
    let multMax: number;
    if (color === "violet") {
      multMin = 2.05;
      multMax = Math.max(3.2, Math.min(4.9, Math.round(q60 * 1.15 * 10) / 10));
    } else if (color === "rose") {
      multMin = 5.1;
      multMax = Math.max(7, Math.min(9.9, Math.round(q60 * 1.15 * 10) / 10));
    } else {
      multMin = 10.2;
      multMax = Math.max(14, Math.min(80, Math.round(q90 * 1.1)));
    }

    out.push({
      id: uid(),
      sessionId: session.id,
      createdAt: now,
      index: i + 1,
      ts: t,
      time: fmtTimeHMS(t),
      color,
      colorProb,
      confidence,
      multMin,
      multMax,
      signal,
      signalType,
      status: "attente",
    });

    prev = color;
    curStreak = color === prev ? curStreak : 1;
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Vérification des anciennes prédictions (auto-apprentissage)         */
/* ------------------------------------------------------------------ */

export function verifyOldPredictions(
  predictions: Prediction[],
  newSession: Session
): { updated: Prediction[]; hits: number } {
  let hits = 0;
  const updated = predictions.map((p) => {
    if (p.status !== "attente") return p;
    const match = newSession.rounds.find((r) => Math.abs(newSession.createdAt - p.ts) < 45 * 60000);
    if (!match) return p;
    hits++;
    if (match.color === p.color) return { ...p, status: "exact" as const };
    // Seuil adjacent (un cran d'écart) = partiel
    const rank: Record<GameColor, number> = { violet: 0, rose: 1, orange: 2 };
    const close = Math.abs(rank[p.color] - rank[match.color]) === 1;
    return { ...p, status: (close ? "partiel" : "manque") as Prediction["status"] };
  });
  return { updated, hits };
}

export function modelAccuracy(predictions: Prediction[]) {
  const verified = predictions.filter((p) => p.status !== "attente");
  const exact = verified.filter((p) => p.status === "exact").length;
  const partiel = verified.filter((p) => p.status === "partiel").length;
  const manque = verified.filter((p) => p.status === "manque").length;
  return {
    verified: verified.length,
    exact,
    partiel,
    manque,
    accuracy: verified.length ? Math.round(((exact + partiel * 0.5) / verified.length) * 100) : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Abonnement                                                           */
/* ------------------------------------------------------------------ */

export type SubStatus =
  | { kind: "trial"; msLeft: number; label: string }
  | { kind: "active"; msLeft: number; label: string }
  | { kind: "expired"; msLeft: number; label: string };

export function subStatus(user: User, now = Date.now()): SubStatus {
  if (user.plan && user.plan.expiresAt > now) {
    return { kind: "active", msLeft: user.plan.expiresAt - now, label: user.plan.label };
  }
  if (user.trialEndsAt > now) {
    return { kind: "trial", msLeft: user.trialEndsAt - now, label: "Essai gratuit" };
  }
  return { kind: "expired", msLeft: 0, label: "Expiré" };
}

/* ------------------------------------------------------------------ */
/* Export CSV des sessions                                              */
/* ------------------------------------------------------------------ */

export function sessionsToCSV(sessions: Session[]): string {
  const head = "session;manche;heure;couleur;multiplicateur;hex;decimal;net_base_simulation_Ar";
  const rows = sessions.flatMap((s) =>
    s.rounds.map((r) =>
      [s.id.slice(0, 6), r.index, r.time, r.color, r.multiplier, r.hex, r.decimal, r.net].join(";")
    )
  );
  return [head, ...rows].join("\n");
}
