import { useMemo } from "react";
import type { GameColor, User } from "../lib/types";
import {
  aggregate,
  COLOR_META,
  fmtAr,
  fmtCountdown,
  fmtNum,
  modelAccuracy,
} from "../lib/engine";
import { brainState, SIGNAL_LABEL } from "../lib/brain";
import { Btn, ColorChip, ColorDot, Corners, SectionLabel, useCountUp, useNow } from "../components/ui";
import { ArrowRight, ClockIcon, Reticle, Target } from "../components/icons";
import type { SignalType } from "../lib/types";

/* ---------------- courbe d'évolution ---------------- */
function EquityCurve({ values }: { values: number[] }) {
  const W = 640;
  const H = 230;
  const padX = 10;
  const padT = 22;
  const padB = 26;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const x = (i: number) => padX + (i / Math.max(1, values.length - 1)) * (W - padX * 2);
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);

  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${padX},${y(min).toFixed(1)} ${pts} ${W - padX},${y(min).toFixed(1)}`;
  const zeroY = y(0);
  const maxI = values.indexOf(Math.max(...values));
  const minI = values.indexOf(Math.min(...values));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
      <defs>
        <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9c7b25" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#9c7b25" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1={padX} x2={W - padX} y1={padT + p * (H - padT - padB)} y2={padT + p * (H - padT - padB)} stroke="#161511" strokeOpacity="0.07" />
      ))}
      {min < 0 && max > 0 && (
        <line x1={padX} x2={W - padX} y1={zeroY} y2={zeroY} stroke="#161511" strokeOpacity="0.35" strokeDasharray="5 4" />
      )}
      <polygon points={area} fill="url(#eqfill)" />
      <polyline points={pts} fill="none" stroke="#161511" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(maxI)} cy={y(values[maxI])} r="4.5" fill="#2e9e63" stroke="#f2f1ec" strokeWidth="2" />
      <circle cx={x(minI)} cy={y(values[minI])} r="4.5" fill="#e0453a" stroke="#f2f1ec" strokeWidth="2" />
      <text x={x(values.length - 1)} y={y(values[values.length - 1]) - 10} textAnchor="end" fontSize="11" fill="#161511" fontFamily="IBM Plex Mono, monospace">
        {fmtAr(values[values.length - 1], false)}
      </text>
      <text x={padX} y={H - 8} fontSize="10" fill="#75715f" fontFamily="IBM Plex Mono, monospace">première manche</text>
      <text x={W - padX} y={H - 8} textAnchor="end" fontSize="10" fill="#75715f" fontFamily="IBM Plex Mono, monospace">dernière manche</text>
    </svg>
  );
}

/* ---------------- donut couleurs ---------------- */
function Donut({ counts }: { counts: Record<GameColor, number> }) {
  const total = counts.violet + counts.rose + counts.orange || 1;
  const R = 44;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const order: GameColor[] = ["violet", "rose", "orange"];
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32">
      <circle cx="60" cy="60" r={R} fill="none" stroke="#161511" strokeOpacity="0.08" strokeWidth="15" />
      {order.map((c) => {
        const frac = counts[c] / total;
        const dash = frac * C;
        const el = (
          <circle
            key={c}
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={COLOR_META[c].css}
            strokeWidth="15"
            strokeDasharray={`${dash} ${C - dash}`}
            strokeDashoffset={-acc * C}
            transform="rotate(-90 60 60)"
            className="transition-all duration-700"
          />
        );
        acc += frac;
        return el;
      })}
      <text x="60" y="57" textAnchor="middle" fontSize="19" fontWeight="600" fill="#161511" fontFamily="Fraunces, serif">
        {total}
      </text>
      <text x="60" y="72" textAnchor="middle" fontSize="8.5" fill="#75715f" fontFamily="IBM Plex Mono, monospace" letterSpacing="1.5">
        MANCHES
      </text>
    </svg>
  );
}

/* ---------------- page ---------------- */
export default function Stats({ user, onGoHome }: { user: User; onGoHome: () => void }) {
  const now = useNow();
  const agg = useMemo(() => aggregate(user.sessions), [user.sessions]);
  const acc = useMemo(() => modelAccuracy(user.predictions), [user.predictions]);
  const netAnim = useCountUp(agg.net);
  const brain = brainState();

  const equity = useMemo(() => {
    const vals = [0];
    let c = 0;
    agg.rounds.forEach((r) => {
      c += r.net;
      vals.push(c);
    });
    return vals;
  }, [agg]);

  if (!user.sessions.length) {
    return (
      <div className="rise max-w-lg mx-auto text-center py-16">
        <span className="inline-grid place-items-center w-16 h-16 rounded-full border border-gold/50 text-gold mb-6">
          <Target size={28} />
        </span>
        <h2 className="font-display text-3xl font-semibold">Aucune donnée à analyser</h2>
        <p className="text-ink-faint mt-3 text-[15px] leading-relaxed">
          Importez vos 3 captures d'écran depuis l'accueil : Snipe calculera gains, pertes,
          fréquences, écarts de couleurs et vos 10 prochaines manches probables.
        </p>
        <Btn onClick={onGoHome} variant="ink" className="mt-8">
          Importer mes captures <ArrowRight size={16} />
        </Btn>
      </div>
    );
  }

  const preds = [...user.predictions].sort((a, b) => a.ts - b.ts).slice(-10);
  const nextPred = preds.find((p) => p.ts > now && p.status === "attente");
  const colors: GameColor[] = ["violet", "rose", "orange"];
  const maxGap = Math.max(...colors.map((c) => agg.gapsMin[c]), 0.1);

  return (
    <div className="space-y-10">
      {/* KPIs */}
      <section className="rise grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative col-span-2 lg:col-span-1 border border-ink/12 bg-ink text-paper px-5 py-5">
          <Corners className="text-gold-soft border-gold-soft" />
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/50">Net cumulé (possible)</p>
          <p className={`font-display text-[32px] leading-none font-semibold mt-2 num ${agg.net >= 0 ? "text-gold-soft" : "text-drouge"}`}>
            {fmtAr(netAnim)}
          </p>
          <p className="text-[11px] text-paper/45 mt-2">
            sur {fmtAr(agg.totalStaked, false)} misés · ROI {agg.totalStaked ? Math.round((agg.net / agg.totalStaked) * 100) : 0}%
          </p>
        </div>
        {[
          { k: "Taux de réussite", v: `${agg.winRate}%`, s: `${agg.wins} gains · ${agg.losses} pertes` },
          { k: "Plus gros gain", v: fmtAr(agg.best, false), s: "meilleure manche", green: true },
          { k: "Plus grosse perte", v: fmtAr(agg.worst, false), s: "pire manche", red: true },
        ].map((c) => (
          <div key={c.k} className="border border-ink/12 bg-paper px-5 py-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">{c.k}</p>
            <p className={`font-display text-[26px] leading-none font-semibold mt-2 num ${c.green ? "text-dgreen" : c.red ? "text-drouge" : ""}`}>
              {c.v}
            </p>
            <p className="text-[11px] text-ink-faint mt-2">{c.s}</p>
          </div>
        ))}
      </section>

      {/* Courbe */}
      <section className="rise" style={{ animationDelay: "60ms" }}>
        <SectionLabel
          right={
            <span className="font-mono text-[10px] text-ink-faint">
              <span className="inline-block w-2 h-2 rounded-full bg-dgreen mr-1" />pic ·{" "}
              <span className="inline-block w-2 h-2 rounded-full bg-drouge mx-1" />creux
            </span>
          }
        >
          Évolution gains / pertes
        </SectionLabel>
        <div className="relative border border-ink/12 bg-paper p-4 md:p-6">
          <Corners className="text-gold/40 border-gold/40" />
          <EquityCurve values={equity} />
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10">
        {/* Fréquence + couleurs */}
        <section className="rise" style={{ animationDelay: "100ms" }}>
          <SectionLabel>Fréquence de jeu</SectionLabel>
          <div className="border border-ink/12 bg-paper divide-y divide-ink/8">
            {[
              { k: "Manches par jour", v: fmtNum(agg.roundsPerDay), s: "rythme moyen observé" },
              { k: "Intervalle moyen", v: `${agg.avgIntervalSec} s`, s: "entre deux manches" },
              { k: "Sessions importées", v: String(user.sessions.length), s: `${agg.rounds.length} manches au total` },
            ].map((r) => (
              <div key={r.k} className="flex items-center justify-between px-5 py-4 group hover:bg-gold-pale/25 transition-colors">
                <div>
                  <p className="text-[14px] font-semibold">{r.k}</p>
                  <p className="text-[11px] text-ink-faint mt-0.5">{r.s}</p>
                </div>
                <p className="font-display text-2xl font-semibold num group-hover:scale-105 transition-transform origin-right">{r.v}</p>
              </div>
            ))}
          </div>

          <SectionLabel>
            <span className="mt-8 block">Couleurs & écarts de répétition</span>
          </SectionLabel>
          <div className="border border-ink/12 bg-paper p-5 flex flex-col sm:flex-row items-center gap-6">
            <Donut counts={agg.colorCounts} />
            <div className="flex-1 w-full space-y-4">
              {colors.map((c) => (
                <div key={c}>
                  <div className="flex items-center justify-between text-[12px] mb-1.5">
                    <span className="flex items-center gap-2 font-semibold">
                      <ColorDot color={c} size={8} /> {COLOR_META[c].label}
                      <span className="font-mono text-[9px] text-gold-deep num">{COLOR_META[c].band}</span>
                      <span className="font-mono text-[10px] text-ink-faint">
                        {Math.round((agg.colorCounts[c] / Math.max(1, agg.rounds.length)) * 100)}%
                      </span>
                    </span>
                    <span className="font-mono text-[11px] num text-ink-faint">
                      écart moy. <strong className="text-ink">{fmtNum(agg.gapsMin[c])} min</strong>
                    </span>
                  </div>
                  <div className="h-2 bg-ink/8 overflow-hidden">
                    <div className="h-full barfill" style={{ width: `${(agg.gapsMin[c] / maxGap) * 100}%`, background: COLOR_META[c].css }} />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-ink-faint leading-relaxed pt-1">
                Plus l'écart moyen est long, plus une répétition de la couleur devient statistiquement « attendue » — c'est ce signal que le modèle pondère.
              </p>
            </div>
          </div>
        </section>

        {/* Prédictions */}
        <section className="rise" style={{ animationDelay: "140ms" }}>
          <SectionLabel
            right={
              nextPred ? (
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-gold num">
                  <ClockIcon size={12} /> prochaine dans {fmtCountdown(nextPred.ts - now)}
                </span>
              ) : (
                <span className="font-mono text-[10px] text-ink-faint">fenêtre écoulée</span>
              )
            }
          >
            10 prochaines manches — probables
          </SectionLabel>

          {/* Précision IA */}
          <div className="relative border border-ink/12 bg-ink text-paper p-4 mb-4">
            <Corners className="text-gold-soft border-gold-soft" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/50">
                  Précision {brain.version} (auto-apprentissage)
                </p>
                <p className="font-display text-3xl font-semibold num mt-1 text-gold-soft">
                  {acc.verified ? `${acc.accuracy}%` : "—"}
                </p>
                <p className="font-mono text-[10px] text-paper/40 mt-1 num">entraînée sur {brain.trainedOn} manches</p>
              </div>
              <div className="text-right text-[11px] font-mono leading-relaxed text-paper/60">
                <p><span className="text-dgreen">■</span> exact : {acc.exact}</p>
                <p><span className="text-gold-soft">■</span> partiel : {acc.partiel}</p>
                <p><span className="text-drouge">■</span> manqué : {acc.manque}</p>
              </div>
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-paper/10 grid grid-cols-3 gap-3">
              {(Object.keys(brain.weights) as SignalType[]).map((t) => (
                <div key={t}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-paper/45">{SIGNAL_LABEL[t]}</span>
                    <span className="font-mono text-[9px] num text-gold-soft">×{fmtNum(brain.weights[t])}</span>
                  </div>
                  <div className="h-1 bg-paper/10 overflow-hidden">
                    <div className="h-full bg-gold-soft barfill" style={{ width: `${(brain.weights[t] / 2) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Liste des prédictions */}
          <ol className="space-y-2.5">
            {preds.map((p, i) => {
              const isNext = nextPred?.id === p.id;
              const past = p.ts <= now;
              return (
                <li
                  key={p.id}
                  className={`relative border px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    isNext ? "border-gold bg-gold-pale/50 shadow-md" : past ? "border-ink/10 bg-paper-deep/50 opacity-75" : "border-ink/12 bg-paper"
                  }`}
                >
                  {isNext && <Corners className="text-gold border-gold" />}
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl font-light text-ink/30 w-7 num leading-none">{String(p.index).padStart(2, "0")}</span>
                    <span className="flex flex-col min-w-0">
                      <span className="font-mono text-[13px] font-medium num leading-tight">{p.time}</span>
                      <span className="text-[10px] text-ink-faint font-mono truncate max-w-40 flex items-center gap-1.5">
                        <Reticle size={10} className="shrink-0 text-gold-deep" /> {p.signal}
                      </span>
                    </span>
                    <span className="ml-auto flex items-center gap-3">
                      <span className="hidden sm:block text-right text-[10px] font-mono text-ink-faint leading-tight">
                        {fmtNum(p.multMin)}–{fmtNum(p.multMax)}×
                      </span>
                      <ColorChip color={p.color} />
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="flex-1 h-1 bg-ink/8 overflow-hidden">
                      <div
                        className="h-full barfill"
                        style={{ width: `${p.confidence}%`, background: COLOR_META[p.color].css, animationDelay: `${i * 60}ms` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] num text-ink-faint w-24 text-right">conf. {p.confidence}%</span>
                    <span
                      className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${
                        p.status === "exact"
                          ? "border-dgreen/50 text-dgreen"
                          : p.status === "partiel"
                            ? "border-gold/60 text-gold-deep"
                            : p.status === "manque"
                              ? "border-drouge/50 text-drouge"
                              : past
                                ? "border-ink/20 text-ink-faint"
                                : "border-gold/40 text-gold-deep"
                      }`}
                    >
                      {p.status === "attente" ? (past ? "non vérifié" : "à venir") : p.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-4 text-[11px] text-ink-faint leading-relaxed border-l-2 border-gold/50 pl-3">
            Probabilités indicatives issues de votre historique personnel (écarts, séries, hex).
            Aucune prédiction ne garantit un résultat sur un jeu aléatoire.
          </p>
        </section>
      </div>
    </div>
  );
}
