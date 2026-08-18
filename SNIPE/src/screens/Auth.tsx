import { useMemo, useState } from "react";
import { findByPhone, login, register, wasDeleted } from "../lib/db";
import type { User } from "../lib/types";
import {
  Logo,
  PhoneIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRight,
  PlaneShower,
  Reticle,
} from "../components/icons";
import { toast } from "../components/ui";

/** Numéro d'exemple tiré au hasard à chaque ouverture (format malgache valide). */
function randomSamplePhone(): string {
  let digits = "";
  do {
    digits = "03" + String(2 + Math.floor(Math.random() * 8));
    for (let i = 0; i < 7; i++) digits += Math.floor(Math.random() * 10);
  } while (digits === "0381645731" || digits === "0335336854");
  return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)}`;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export default function Auth({ onAuth }: { onAuth: (u: User) => void }) {
  const samplePhone = useMemo(randomSamplePhone, []);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const digits = normalizePhone(phone);
  const phoneOk = digits.length === 10 && digits.startsWith("03");
  const passOk = pass.length >= 4;
  const known = digits.length === 10 && findByPhone(digits) !== null;
  const wasDel = digits.length === 10 && wasDeleted(digits);

  const submit = () => {
    if (!phoneOk) {
      toast("Numéro invalide — format attendu : 03X XX XXX XX.", "err");
      return;
    }
    if (!passOk) {
      toast("Mot de passe trop court (4 caractères minimum).", "err");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const res: { ok: boolean; error?: string; user?: User; burnedTrial?: boolean } =
        mode === "signup" ? register(digits, pass) : login(digits, pass);
      setBusy(false);
      if (!res.ok || !res.user) {
        toast(res.error ?? "Une erreur est survenue.", "err");
        return;
      }
      if (mode === "signup" && res.burnedTrial) {
        toast("Ce numéro a déjà utilisé l'essai gratuit — il ne sera pas accordé à nouveau.", "info");
      } else if (mode === "signup") {
        toast("Bienvenue sur Snipe — 1 h d'essai gratuit activées.");
      } else {
        toast(`Bon retour — heureux de vous revoir.`);
      }
      onAuth(res.user);
    }, 550);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ---------- Panneau de marque ---------- */}
      <div className="relative lg:w-[44%] bg-ink text-paper overflow-hidden flex flex-col justify-between px-8 py-8 lg:px-12 lg:py-10">
        <svg
          className="absolute -right-28 -top-28 opacity-[0.16] spin-slow"
          width="460"
          height="460"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="96" stroke="#9c7b25" strokeWidth="0.7" />
          <circle cx="100" cy="100" r="70" stroke="#f2f1ec" strokeWidth="0.5" strokeDasharray="3 6" />
          <circle cx="100" cy="100" r="42" stroke="#9c7b25" strokeWidth="0.7" />
          <path d="M100 0v40M100 160v40M0 100h40M160 100h40" stroke="#f2f1ec" strokeWidth="0.6" />
        </svg>
        <svg className="absolute -right-28 -top-28 opacity-85" width="460" height="460" viewBox="0 0 200 200" fill="none" aria-hidden="true">
          <PlaneShower cx={100} cy={100} r={40} scale={1.05} />
        </svg>

        <div className="relative">
          <span className="inline-flex text-paper">
            <LogoMark />
          </span>
        </div>

        <div className="relative max-w-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-soft mb-4">
            Analyse prédictive · Madagascar
          </p>
          <h1 className="font-display text-[2.6rem] lg:text-[3.2rem] leading-[1.02] font-semibold">
            Visez juste.
            <br />
            <em className="text-gold-soft not-italic">Prédisez</em> la prochaine manche.
          </h1>
          <p className="text-paper/60 text-[15px] leading-relaxed mt-5">
            Snipe analyse l'historique de vos parties — couleurs, écarts de répétition, hex et
            décimal — pour estimer honnêtement vos chances sur les 10 prochaines manches.
          </p>

          <div className="mt-8 space-y-3.5">
            {[
              { n: "01", t: "Importez 3 captures", d: "historique, dernier résultat, détails techniques." },
              { n: "02", t: "L'IA extrait et apprend", d: "chaque import affine la précision du modèle." },
              { n: "03", t: "10 prédictions horodatées", d: "couleur probable, confiance et fourchette." },
            ].map((f) => (
              <div key={f.n} className="flex gap-4 items-start">
                <span className="font-mono text-[11px] text-gold-soft tracking-[0.2em] pt-1">{f.n}</span>
                <div>
                  <p className="font-semibold text-[15px]">{f.t}</p>
                  <p className="text-paper/50 text-[13px] mt-0.5">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-[10px] text-paper/35 tracking-wider hidden lg:block">
          Usage personnel · Les probabilités sont indicatives, aucun gain n'est garanti.
        </p>
      </div>

      {/* ---------- Formulaire ---------- */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-8">
        <div className="w-full max-w-sm rise" style={{ animationDelay: "120ms" }}>
          <div className="flex border border-ink/15 mb-8 p-1 bg-paper-deep/60">
            {(["signup", "login"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all ${
                  mode === m ? "bg-ink text-paper shadow" : "text-ink-faint hover:text-ink"
                }`}
              >
                {m === "signup" ? "Inscription" : "Connexion"}
              </button>
            ))}
          </div>

          <h2 className="font-display text-3xl font-semibold">
            {mode === "signup" ? "Créer un compte" : "Bon retour"}
          </h2>
          <p className="text-ink-faint text-[14px] mt-1.5">
            {mode === "signup"
              ? "Gratuit pendant 1 h, sans engagement."
              : "Connectez-vous pour retrouver votre historique."}
          </p>

          <div className="mt-7 space-y-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                Numéro de téléphone
              </span>
              <div className={`mt-1.5 flex items-center gap-3 border px-4 py-3.5 transition-colors ${
                phone && !phoneOk ? "border-drouge/60" : "border-ink/20 focus-within:border-gold"
              } bg-paper`}>
                <PhoneIcon size={17} className="text-gold-deep shrink-0" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={samplePhone}
                  inputMode="tel"
                  className="flex-1 bg-transparent text-[15px] font-mono num placeholder:text-ink-faint/50"
                />
              </div>
              {phone && !phoneOk && (
                <span className="block mt-1.5 text-[12px] text-drouge">Format attendu : 03X XX XXX XX.</span>
              )}
              {known && mode === "signup" && (
                <span className="block mt-1.5 text-[12px] text-gold-deep">
                  Ce numéro est déjà inscrit — passez en « Connexion ».
                </span>
              )}
              {wasDel && mode === "signup" && (
                <span className="block mt-1.5 text-[12px] text-drouge">
                  Ce numéro a déjà utilisé l'essai gratuit — il ne sera pas accordé à nouveau.
                </span>
              )}
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                Mot de passe
              </span>
              <div className={`mt-1.5 flex items-center gap-3 border px-4 py-3.5 transition-colors ${
                pass && !passOk ? "border-drouge/60" : "border-ink/20 focus-within:border-gold"
              } bg-paper`}>
                <LockIcon size={17} className="text-gold-deep shrink-0" />
                <input
                  type={show ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  className="flex-1 bg-transparent text-[15px] font-mono placeholder:text-ink-faint/50"
                />
                <button type="button" onClick={() => setShow(!show)} className="text-ink-faint hover:text-gold-deep transition-colors">
                  {show ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
                </button>
              </div>
            </label>
          </div>

          <button
            onClick={submit}
            disabled={busy || !phoneOk || !passOk}
            className="mt-7 w-full flex items-center justify-center gap-2.5 bg-ink text-paper py-4 font-semibold text-[15px] tracking-wide hover:bg-gold-deep transition-all duration-200 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
          >
            {busy ? "Vérification…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}
            {!busy && <ArrowRight size={17} />}
          </button>

          <div className="mt-6 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-gold-deep border border-gold/40 bg-gold-pale/40 px-3 py-1.5">
              <Reticle size={13} /> Essai gratuit · 1 h
            </span>
            <span className="font-mono text-[10px] text-ink-faint">Aucun abonnement requis</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="16" stroke="#c9ac5b" strokeWidth="2.2" />
      <path d="M24 2v10M24 36v10M2 24h10M36 24h10" stroke="#f2f1ec" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill="#c9ac5b" />
      <circle cx="24" cy="24" r="21.5" stroke="#f2f1ec" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 5" />
    </svg>
  );
}
