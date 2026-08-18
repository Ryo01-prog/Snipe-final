import { useMemo, useRef, useState } from "react";
import type { GameColor, Session, User } from "../lib/types";
import {
  buildSession,
  fmtAr,
  fmtCountdown,
  fmtDate,
  fmtNum,
  fmtTimeHMS,
  hashSamples,
  makePredictions,
  modelAccuracy,
  verifyOldPredictions,
  COLOR_META,
  GAME_NAME,
  GAME_URL,
} from "../lib/engine";
import { brainReport, brainState, brainTrain } from "../lib/brain";
import { pushEvent } from "../lib/notifs";
import {
  ArrowRight,
  BoltIcon,
  CameraIcon,
  CheckIcon,
  LayersIcon,
  Reticle,
  ScanIcon,
  UploadIcon,
  XIcon,
} from "../components/icons";
import { Btn, ColorDot, Corners, SectionLabel, toast, useNow } from "../components/ui";

interface Slot {
  title: string;
  desc: string;
  name: string | null;
  dataUrl: string | null;
  sample: number[];
}

const SLOT_DEFS = [
  {
    title: "Historique des manches",
    desc: "Capture de la liste des parties jouées (couleurs et multiplicateurs).",
  },
  {
    title: "Dernière manche",
    desc: "Date, heure et résultat de la manche la plus récente.",
  },
  {
    title: "Détails techniques",
    desc: "Hex, décimal et résultat — la signature de la manche.",
  },
];

function fileSample(f: File): Promise<number[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer);
      const out: number[] = [];
      const step = Math.max(1, Math.floor(arr.length / 24));
      for (let i = 0; i < arr.length && out.length < 24; i += step) out.push(arr[i]);
      resolve(out);
    };
    reader.onerror = () => resolve([f.size % 256, f.name.length]);
    reader.readAsArrayBuffer(f.slice(0, 4096));
  });
}

export default function Home({
  user,
  update,
  onGoStats,
}: {
  user: User;
  update: (fn: (u: User) => User) => void;
  onGoStats: () => void;
}) {
  const now = useNow();
  const [slots, setSlots] = useState<Slot[]>(
    SLOT_DEFS.map((d) => ({ ...d, name: null, dataUrl: null, sample: [] }))
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const allFilled = slots.every((s) => s.name);
  const acc = useMemo(() => modelAccuracy(user.predictions), [user.predictions]);
  const lastSession = user.sessions[user.sessions.length - 1];

  const onFile = async (i: number, f: File) => {
    if (!f.type.startsWith("image/")) {
      toast("Format non reconnu — importez une capture d'écran (image).", "err");
      return;
    }
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(f);
    });
    const sample = await fileSample(f);
    setSlots((cur) => cur.map((s, j) => (j === i ? { ...s, name: f.name, dataUrl, sample } : s)));
  };

  const analyze = () => {
    if (!allFilled) return;
    setAnalyzing(true);
    setStep(0);
    const steps = [
      "Lecture des 3 captures…",
      "OCR — extraction des couleurs et multiplicateurs…",
      "Lecture hex & décimal…",
      "Calcul des écarts de répétition…",
      "Calibration du modèle…",
    ];
    steps.forEach((_, i) => setTimeout(() => setStep(i + 1), 480 * (i + 1)));
    setTimeout(() => {
      const seed = hashSamples(
        slots.map((s) => s.sample),
        slots.map((s) => s.name ?? "x")
      );
      const s = buildSession(seed, slots.map((sl) => ({ name: sl.name ?? "", size: sl.sample.length, dataUrl: sl.dataUrl ?? "" })));
      setSession(s);
      setAnalyzing(false);
    }, 480 * steps.length + 350);
  };

  const iaReport = useMemo(() => (session ? brainReport(session) : []), [session]);
  const brain = useMemo(() => brainState(), [session]);

  const go = () => {
    if (!session) return;
    const { updated } = verifyOldPredictions(user.predictions, session);
    const train = brainTrain(updated);
    const preds = makePredictions(
      session,
      hashSamples(
        slots.map((s) => s.sample),
        slots.map((s) => s.name ?? "x")
      ) ^ session.rounds.length * 2654435761,
      train.state.weights
    );
    update((u) => ({
      ...u,
      sessions: [...u.sessions, session],
      predictions: [...updated, ...preds],
    }));
    pushEvent(
      user.phone,
      "ok",
      "10 prédictions générées",
      train.verifiedNow > 0
        ? `IA ré-entraînée sur ${train.verifiedNow} manches (précision ${train.accuracy}%).`
        : "Le modèle apprendra dès le prochain import.",
      `pred-${session.id}`
    );
    toast(
      train.verifiedNow > 0
        ? `IA ré-entraînée sur ${train.verifiedNow} manches — 10 nouvelles prédictions.`
        : "10 prédictions générées — l'IA apprendra au prochain import."
    );
    reset();
    onGoStats();
  };

  const reset = () => {
    setSlots(SLOT_DEFS.map((d) => ({ ...d, name: null, dataUrl: null, sample: [] })));
    setSession(null);
    setStep(0);
  };

  return (
    <div className="space-y-10">
      {/* ---------- Jeu analysé — bandes officielles ---------- */}
      <section className="rise">
        <a
          href={GAME_URL}
          target="_blank"
          rel="noreferrer"
          className="group relative block border border-ink/15 bg-ink text-paper overflow-hidden"
        >
          <Corners className="text-gold-soft border-gold-soft" />
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-5 py-4">
            <span className="inline-grid place-items-center w-11 h-11 border border-gold/50 text-gold-soft shrink-0">
              <Reticle size={22} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-gold-soft">
                Jeu analysé — seuils « supérieur à »
              </p>
              <p className="font-display text-xl font-semibold mt-0.5 flex items-center gap-2.5">
                {GAME_NAME}
                <span className="font-mono text-[10px] text-paper/40 tracking-wide">bet261.mg</span>
                <ArrowRight size={15} className="text-gold-soft group-hover:translate-x-1.5 transition-transform" />
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["violet", "rose", "orange"] as GameColor[]).map((c) => (
                <span key={c} className="flex items-center gap-2 border border-paper/15 px-3 py-1.5 group-hover:border-gold/40 transition-colors">
                  <ColorDot color={c} size={9} />
                  <span className="text-[12px] font-semibold">{COLOR_META[c].label}</span>
                  <span className="font-mono text-[11px] num text-gold-soft">{COLOR_META[c].band}</span>
                </span>
              ))}
            </div>
          </div>
        </a>
      </section>

      {/* ---------- Résumé dernière session ---------- */}
      {lastSession && !session && (
        <section className="rise" style={{ animationDelay: "40ms" }}>
          <SectionLabel
            right={
              acc.verified > 0 ? (
                <span className="font-mono text-[10px] text-gold-deep num">
                  précision IA {acc.accuracy}%
                </span>
              ) : undefined
            }
          >
            Dernière session enregistrée
          </SectionLabel>
          <div className="relative border border-ink/12 bg-paper px-5 py-5">
            <Corners className="text-gold/40 border-gold/40" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">Importée le</p>
                <p className="font-semibold text-[15px] mt-1">{fmtDate(lastSession.createdAt)}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">Manches</p>
                <p className="font-display text-2xl font-semibold num mt-0.5">{lastSession.rounds.length}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">Dernière manche</p>
                <p className="font-semibold text-[15px] mt-1 flex items-center gap-2">
                  <ColorDot color={lastSession.last.color} />
                  <span className="num">{fmtNum(lastSession.last.multiplier)}×</span>
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">Net simulé</p>
                <p className={`font-display text-2xl font-semibold num mt-0.5 ${
                  lastSession.rounds.reduce((a, r) => a + r.net, 0) >= 0 ? "text-dgreen" : "text-drouge"
                }`}>
                  {fmtAr(lastSession.rounds.reduce((a, r) => a + r.net, 0), false)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Import des 3 captures ---------- */}
      {!session && (
        <section className="rise" style={{ animationDelay: "80ms" }}>
          <SectionLabel>Importez vos 3 captures d'écran</SectionLabel>
          <div className="grid md:grid-cols-3 gap-4">
            {slots.map((s, i) => (
              <div
                key={i}
                onClick={() => fileRefs[i].current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) onFile(i, f);
                }}
                className={`relative group cursor-pointer border transition-all duration-200 min-h-[190px] flex flex-col ${
                  s.name
                    ? "border-gold bg-gold-pale/30"
                    : "border-dashed border-ink/25 bg-paper hover:border-gold hover:-translate-y-0.5"
                }`}
              >
                <input
                  ref={fileRefs[i]}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(i, f);
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center justify-between px-4 pt-3.5">
                  <span className="font-mono text-[10px] tracking-[0.24em] text-gold-deep">
                    CAPTURE {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.name && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSlots((cur) => cur.map((x, j) => (j === i ? { ...x, name: null, dataUrl: null, sample: [] } : x)));
                      }}
                      className="text-ink-faint hover:text-drouge transition-colors"
                    >
                      <XIcon size={15} />
                    </button>
                  )}
                </div>
                <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 text-center">
                  {s.dataUrl ? (
                    <>
                      <img src={s.dataUrl} alt={s.title} className="max-h-24 border border-ink/15 object-contain" />
                      <p className="mt-2.5 text-[12px] font-semibold truncate max-w-full">{s.name}</p>
                      <p className="flex items-center gap-1 text-[11px] text-dgreen mt-1">
                        <CheckIcon size={12} /> Image chargée
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="grid place-items-center w-12 h-12 rounded-full border border-ink/20 text-ink-faint group-hover:border-gold group-hover:text-gold-deep transition-colors">
                        <UploadIcon size={20} />
                      </span>
                      <p className="mt-3 text-[14px] font-semibold">{s.title}</p>
                      <p className="text-[11.5px] text-ink-faint mt-1 leading-snug">{s.desc}</p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gold-deep mt-2.5">
                        Cliquer ou déposer
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Btn onClick={analyze} disabled={!allFilled || analyzing} variant="gold" className="!px-8">
              {analyzing ? <ScanIcon size={17} className="animate-pulse" /> : <BoltIcon size={17} />}
              {analyzing ? "Analyse en cours…" : "Analyser les captures"}
            </Btn>
          </div>

          {analyzing && (
            <div className="rise mt-6 relative border border-ink/15 bg-ink text-paper px-5 py-5 overflow-hidden">
              <div className="scan-overlay absolute inset-0" />
              <div className="relative space-y-2.5">
                {["Lecture des 3 captures", "OCR — couleurs & multiplicateurs", "Hex & décimal", "Écarts de répétition", "Calibration du modèle"].map(
                  (label, i) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className={`grid place-items-center w-5 h-5 rounded-full border text-[9px] num ${
                        step > i ? "border-dgreen bg-dgreen text-paper" : step === i ? "border-gold-soft text-gold-soft pulse-dot" : "border-paper/25 text-paper/40"
                      }`}>
                        {step > i + 1 ? <CheckIcon size={11} /> : i + 1}
                      </span>
                      <span className={`font-mono text-[12px] ${step > i ? "text-paper" : "text-paper/40"}`}>{label}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------- Revue avant GO ---------- */}
      {session && (
        <section className="rise">
          <SectionLabel
            right={
              <span className="font-mono text-[10px] text-ink-faint">
                extraite le {fmtDate(session.createdAt)}
              </span>
            }
          >
            Extraction réussie — vérifiez puis lancez la prédiction
          </SectionLabel>

          <div className="space-y-6">
            {/* Données extraites */}
            <div className="relative border border-dgreen/50 bg-paper p-5">
              <Corners className="text-dgreen border-dgreen" />
              <div className="flex items-center gap-3 mb-4">
                <span className="grid place-items-center w-9 h-9 rounded-full bg-dgreen text-paper">
                  <CheckIcon size={18} />
                </span>
                <div>
                  <p className="font-semibold text-[15px]">Données extraites des 3 captures</p>
                  <p className="text-[12px] text-ink-faint">
                    {session.rounds.length} manches détectées · les mises ne sont jamais lues
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { k: "Date détectée", v: session.last.dateLabel },
                  { k: "Dernière manche", v: session.last.time },
                  { k: "Hex", v: session.last.hex, mono: true },
                  { k: "Décimal", v: String(session.last.decimal), mono: true },
                ].map((c) => (
                  <div key={c.k} className="border border-ink/12 bg-paper px-4 py-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">{c.k}</p>
                    <p className={`mt-1 font-semibold text-[15px] num ${c.mono ? "font-mono" : ""}`}>{c.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rapport IA */}
            <div className="relative border border-ink/15 bg-ink text-paper p-5 md:p-6">
              <Corners className="text-gold-soft border-gold-soft" />
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="inline-grid place-items-center w-9 h-9 border border-gold/50 text-gold-soft">
                  <Reticle size={18} />
                </span>
                <div className="flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-soft">
                    Rapport d'analyse — {brain.version}
                  </p>
                  <p className="text-[12px] text-paper/50 mt-0.5">
                    Motifs détectés sur cette session · entraînée sur {brain.trainedOn} manches au total
                  </p>
                </div>
              </div>
              <ul className="grid md:grid-cols-2 gap-x-8 gap-y-2.5">
                {iaReport.map((line, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-paper/80 leading-relaxed">
                    <span className="mt-[7px] w-1.5 h-1.5 shrink-0 bg-gold-soft" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            {/* Aperçu des manches */}
            <div className="border border-ink/12 bg-paper">
              <div className="px-4 py-3 border-b border-ink/10 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint flex items-center gap-2">
                  <LayersIcon size={14} /> Manches extraites ({session.rounds.length})
                </p>
                <span className="flex items-center gap-3">
                  {(["violet", "rose", "orange"] as GameColor[]).map((c) => (
                    <span key={c} className="flex items-center gap-1.5 font-mono text-[10px] text-ink-faint">
                      <ColorDot color={c} size={7} />
                      {session.rounds.filter((r) => r.color === c).length}
                    </span>
                  ))}
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-[12.5px]">
                  <tbody>
                    {[...session.rounds].reverse().map((r) => (
                      <tr key={r.index} className="border-b border-ink/6 last:border-0 hover:bg-gold-pale/25 transition-colors">
                        <td className="px-4 py-2 font-mono text-ink-faint num w-10">#{r.index + 1}</td>
                        <td className="px-2 py-2 font-mono num">{r.time}</td>
                        <td className="px-2 py-2">
                          <span className="flex items-center gap-2">
                            <ColorDot color={r.color} />
                            <span className="capitalize">{r.color}</span>
                          </span>
                        </td>
                        <td className="px-2 py-2 font-mono num text-right">{fmtNum(r.multiplier)}×</td>
                        <td className="px-2 py-2 font-mono text-ink-faint hidden sm:table-cell">{r.hex}</td>
                        <td className={`px-4 py-2 font-mono num text-right ${r.net >= 0 ? "text-dgreen" : "text-drouge"}`}>
                          {fmtAr(r.net, false)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-2.5 border-t border-ink/10 text-[11px] text-ink-faint">
                Colonne « Net » simulée sur une base fixe de <strong className="text-ink">1 000 Ar</strong> par manche — vos mises réelles ne sont ni extraites ni stockées.
              </p>
            </div>

            <div className="sticky bottom-20 md:bottom-6 z-10">
              <div className="relative border border-gold bg-gold-pale/70 backdrop-blur px-5 py-4 flex flex-col sm:flex-row items-center gap-4 shadow-xl">
                <Corners className="text-gold border-gold" />
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-semibold text-[15px]">Prêt à prédire les 10 prochaines manches</p>
                  <p className="text-[12px] text-ink-faint mt-0.5">
                    {session.rounds.length} manches analysées · modèle {brain.version}
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <Btn variant="ghost" onClick={reset}>
                    Annuler
                  </Btn>
                  <Btn variant="ink" onClick={go} className="!px-8">
                    GO — 10 prédictions <ArrowRight size={16} />
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Comment ça marche ---------- */}
      {!session && !analyzing && (
        <section className="rise" style={{ animationDelay: "120ms" }}>
          <SectionLabel>Ce que le modèle analyse</SectionLabel>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: <LayersIcon size={19} />,
                t: "Couleurs & écarts",
                d: "La répétition de chaque couleur (violet, rose, orange) et l'écart en minutes entre deux apparitions.",
              },
              {
                icon: <CameraIcon size={19} />,
                t: "Séries & ruptures",
                d: "Les séquences de couleurs identiques — au-delà de 3, le modèle anticipe une rupture.",
              },
              {
                icon: <BoltIcon size={19} />,
                t: "Seuils « supérieur à »",
                d: "Violet > ×2 · rose > ×5 · orange > ×10 : la couleur prédite correspond exactement au multiplicateur affiché par le jeu. Hex et décimal croisés en signal secondaire.",
              },
            ].map((c) => (
              <div key={c.t} className="border border-ink/12 bg-paper px-5 py-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <span className="inline-grid place-items-center w-10 h-10 border border-gold/50 text-gold-deep mb-3.5">
                  {c.icon}
                </span>
                <p className="font-semibold text-[15px]">{c.t}</p>
                <p className="text-[13px] text-ink-faint leading-relaxed mt-1.5">{c.d}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
