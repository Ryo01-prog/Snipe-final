import type { GameColor, Prediction, Session, SignalType } from "./types";
import { COLOR_META, aggregate, fmtNum } from "./engine";

/* ------------------------------------------------------------------ */
/* Snipe IA — mémoire, pondérations & auto-apprentissage               */
/* ------------------------------------------------------------------ */

const KEY = "snipe.brain.v1";

export interface BrainState {
  weights: Record<SignalType, number>;
  trainedOn: number;
  history: { ts: number; accuracy: number }[];
  version: string;
}

const DEFAULT_STATE: BrainState = {
  weights: { ecart: 1, serie: 1, frequence: 1 },
  trainedOn: 0,
  history: [],
  version: "SNP-IA 1.0",
};

export function brainState(): BrainState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE, weights: { ...DEFAULT_STATE.weights } };
    const parsed = JSON.parse(raw) as Partial<BrainState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      weights: { ...DEFAULT_STATE.weights, ...(parsed.weights ?? {}) },
      history: parsed.history ?? [],
    };
  } catch {
    return { ...DEFAULT_STATE, weights: { ...DEFAULT_STATE.weights } };
  }
}

function save(s: BrainState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const SIGNAL_LABEL: Record<SignalType, string> = {
  ecart: "Écarts de répétition",
  serie: "Ruptures de série",
  frequence: "Fréquence & hex",
};

const clampW = (w: number) => Math.max(0.4, Math.min(2, Math.round(w * 100) / 100));

export interface TrainResult {
  verifiedNow: number;
  lines: string[];
  accuracy: number;
  state: BrainState;
}

/** Ajuste les pondérations selon les résultats réels constatés. */
export function brainTrain(predictions: Prediction[]): TrainResult {
  const st = brainState();
  const deltas: Record<SignalType, number> = { ecart: 0, serie: 0, frequence: 0 };
  let verifiedNow = 0;

  predictions.forEach((p) => {
    if (p.status === "attente" || !p.signalType) return;
    verifiedNow++;
    if (p.status === "exact") deltas[p.signalType] += 0.07;
    else if (p.status === "partiel") deltas[p.signalType] += 0.02;
    else deltas[p.signalType] -= 0.05;
  });

  const lines: string[] = [];
  if (verifiedNow > 0) {
    (Object.keys(deltas) as SignalType[]).forEach((t) => {
      if (Math.abs(deltas[t]) < 0.005) return;
      const before = st.weights[t];
      const after = clampW(before + deltas[t]);
      st.weights[t] = after;
      lines.push(
        `Signal « ${SIGNAL_LABEL[t].toLowerCase()} » ${after > before ? "renforcé" : "tempéré"} : ${fmtNum(before)} → ${fmtNum(after)}`
      );
    });
    st.trainedOn += verifiedNow;
  }

  const verified = predictions.filter((p) => p.status !== "attente");
  const exact = verified.filter((p) => p.status === "exact").length;
  const partiel = verified.filter((p) => p.status === "partiel").length;
  const accuracy = verified.length
    ? Math.round(((exact + partiel * 0.5) / verified.length) * 100)
    : 0;

  if (verifiedNow > 0) {
    st.history = [...st.history.slice(-11), { ts: Date.now(), accuracy }];
    lines.push(
      accuracy >= 60
        ? `Précision globale ${accuracy}% — le modèle gagne en fiabilité.`
        : `Précision globale ${accuracy}% — pondérations rééquilibrées.`
    );
  }

  save(st);
  return { verifiedNow, lines, accuracy, state: st };
}

/** Rapport d'analyse d'une session (motifs détectés). */
export function brainReport(session: Session): string[] {
  const agg = aggregate([session]);
  const lines: string[] = [];
  const rounds = session.rounds;
  if (!rounds.length) return lines;

  lines.push(
    "Seuils appliqués : violet > ×2 · rose > ×5 · orange > ×10 — la couleur prédite correspond exactement au multiplicateur affiché par le jeu."
  );

  const total = rounds.length;
  const dom = (Object.keys(agg.colorCounts) as GameColor[]).reduce((a, b) =>
    agg.colorCounts[a] >= agg.colorCounts[b] ? a : b
  );
  lines.push(
    `Couleur dominante : ${COLOR_META[dom].label.toLowerCase()} (${Math.round(
      (agg.colorCounts[dom] / total) * 100
    )}% des manches) — référence de fréquence.`
  );

  const gapColor = (Object.keys(agg.gapsMin) as GameColor[]).reduce((a, b) =>
    agg.gapsMin[a] >= agg.gapsMin[b] ? a : b
  );
  lines.push(
    `Écart de répétition le plus long : ${COLOR_META[gapColor].label.toLowerCase()} ≈ ${fmtNum(
      agg.gapsMin[gapColor]
    )} min — fenêtre de répétition privilégiée.`
  );

  let bestStreak = 1;
  let cur = 1;
  for (let i = 1; i < rounds.length; i++) {
    if (rounds[i].color === rounds[i - 1].color) cur++;
    else cur = 1;
    bestStreak = Math.max(bestStreak, cur);
  }
  lines.push(`Série maximale observée : ${bestStreak}× — au-delà de 3, le modèle anticipe une rupture.`);

  const avgMult = rounds.reduce((a, r) => a + r.multiplier, 0) / total;
  lines.push(`Multiplicateur moyen ${fmtNum(avgMult)}× — calibration des fourchettes de gain.`);

  return lines;
}
