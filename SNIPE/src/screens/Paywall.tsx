import { useEffect, useState } from "react";
import type { User } from "../lib/types";
import {
  AIRTEL_NUMBER,
  MVOLA_NUMBER,
  PLANS,
  fmtAr,
  fmtDate,
  subStatus,
  uid,
} from "../lib/engine";
import { updateUser } from "../lib/db";
import { pushEvent } from "../lib/notifs";
import { Btn, Corners, toast, useNow } from "../components/ui";
import { CheckIcon, CopyIcon, Reticle, WalletIcon } from "../components/icons";

export default function Paywall({ user, onActivated }: { user: User; onActivated: (u: User) => void }) {
  const now = useNow();
  const st = subStatus(user, now);
  const [plan, setPlan] = useState(PLANS[1]);
  const [method, setMethod] = useState<"mvola" | "airtel">("mvola");
  const [ref, setRef] = useState("");
  const [phase, setPhase] = useState<"pay" | "verif" | "done" | "attente">("pay");

  const copy = (txt: string) => {
    navigator.clipboard?.writeText(txt).then(
      () => toast(`Numéro ${txt} copié.`),
      () => toast("Copie impossible — notez le numéro manuellement.", "err")
    );
  };

  const number = method === "mvola" ? MVOLA_NUMBER : AIRTEL_NUMBER;

  const refIsValid = (m: "mvola" | "airtel", r: string) => {
    const c = r.trim().toUpperCase().replace(/\s+/g, "");
    if (m === "mvola") {
      return (
        /^M[PV]\d{6}[.]?\d{4}[.]?[A-Z0-9]{3,10}$/.test(c) ||
        (c.length >= 10 && /[A-Z]/.test(c) && /\d{5,}/.test(c))
      );
    }
    return /^\d{8,15}$/.test(c);
  };

  // Dès qu'un paiement en attente est validé (admin ou automate), on déverrouille.
  useEffect(() => {
    if (phase !== "attente") return;
    const t = setInterval(() => {
      try {
        const raw = localStorage.getItem("snipe.users.v1");
        if (!raw) return;
        const users = JSON.parse(raw) as User[];
        const fresh = users.find((u) => u.phone === user.phone);
        if (fresh && fresh.plan && fresh.plan.expiresAt > Date.now()) {
          clearInterval(t);
          toast(`Paiement validé — abonnement ${fresh.plan.label} activé automatiquement.`);
          onActivated(fresh);
        }
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => clearInterval(t);
  }, [phase, user.phone, onActivated]);

  const verify = () => {
    const cleanRef = ref.trim().toUpperCase().replace(/\s+/g, "");
    if (cleanRef.length < 6) {
      toast("Référence de transaction trop courte (6 caractères min).", "err");
      return;
    }
    setPhase("verif");
    setTimeout(() => {
      if (refIsValid(method, cleanRef)) {
        const base = user.plan && user.plan.expiresAt > Date.now() ? user.plan.expiresAt : Date.now();
        const next: User = {
          ...user,
          pendingPayments: (user.pendingPayments ?? []).filter((p) => p.ref !== cleanRef),
          plan: { id: plan.id, label: plan.label, expiresAt: base + plan.days * 86_400_000 },
          payments: [
            ...user.payments,
            { id: uid(), planId: plan.id, amount: plan.price, method, ref: cleanRef, at: Date.now() },
          ],
        };
        updateUser(next);
        pushEvent(user.phone, "ok", "Paiement confirmé", `${plan.label} activés jusqu'au ${fmtDate(next.plan!.expiresAt)}.`, `pay-${cleanRef}`);
        setPhase("done");
        setTimeout(() => {
          toast(`Paiement vérifié automatiquement — ${plan.label} activés.`);
          onActivated(next);
        }, 900);
      } else {
        const next: User = {
          ...user,
          pendingPayments: [
            ...(user.pendingPayments ?? []),
            { id: uid(), planId: plan.id, amount: plan.price, method, ref: cleanRef, at: Date.now() },
          ],
        };
        updateUser(next);
        setPhase("attente");
      }
    }, 1900);
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center py-8">
      <div className="max-w-4xl mx-auto w-full px-1">
        <div className="text-center mb-10">
          <span className="inline-grid place-items-center w-16 h-16 rounded-full border border-gold/50 text-gold mb-5">
            <Reticle size={30} />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
            {user.blocked ? "Compte suspendu" : st.kind === "expired" ? "Accès expiré" : "Renouvellement"}
          </p>
          <h1 className="font-display text-4xl font-semibold mt-2.5">
            {user.blocked ? "Régularisez votre abonnement" : "Reprenez vos prédictions"}
          </h1>
          <p className="text-ink-faint text-[15px] mt-3 max-w-xl mx-auto leading-relaxed">
            {user.blocked
              ? "Votre accès a été suspendu par l'administrateur. Payez votre forfait via Mvola ou Airtel pour le réactiver immédiatement."
              : "Votre délai est écoulé. Choisissez une offre, payez via Mvola ou Airtel, et votre accès s'active automatiquement."}
          </p>
        </div>

        {phase === "done" ? (
          <div className="rise border border-dgreen/40 bg-dgreen/8 p-10 text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-full bg-dgreen text-paper mb-4">
              <CheckIcon size={26} />
            </span>
            <p className="font-display text-2xl font-semibold">Paiement confirmé</p>
            <p className="text-ink-faint mt-2 text-sm">Activation de votre accès en cours…</p>
          </div>
        ) : phase === "attente" ? (
          <div className="rise relative border border-gold/60 bg-gold-pale/50 p-10 text-center">
            <Corners className="text-gold border-gold" />
            <span className="inline-grid place-items-center w-14 h-14 rounded-full border border-gold text-gold mb-4">
              <Reticle size={24} className="animate-spin" />
            </span>
            <p className="font-display text-2xl font-semibold">Vérification en cours</p>
            <p className="text-ink-faint mt-3 text-sm max-w-md mx-auto leading-relaxed">
              La référence <span className="font-mono text-ink">{ref.trim().toUpperCase()}</span> n'a pas
              pu être confirmée automatiquement. Elle est en file de validation : votre offre{" "}
              <strong className="text-ink">{plan.label}</strong> sera activée{" "}
              <strong className="text-ink">automatiquement</strong> dès confirmation.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep mt-5">
              Cette page se déverrouille toute seule — revenez dans quelques minutes
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1.2fr_1fr] gap-8">
            {/* Offres */}
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-faint">1 · Choisissez votre offre</p>
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p)}
                  className={`w-full flex items-center justify-between border px-5 py-4 transition-all duration-200 ${
                    plan.id === p.id
                      ? "border-gold bg-gold-pale/50 shadow-md"
                      : "border-ink/15 bg-paper hover:border-gold/50 hover:-translate-y-0.5"
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <span className={`grid place-items-center w-5 h-5 rounded-full border-2 ${plan.id === p.id ? "border-gold bg-gold" : "border-ink/30"}`}>
                      {plan.id === p.id && <CheckIcon size={11} className="text-paper" />}
                    </span>
                    <span className="text-left">
                      <span className="block font-semibold text-[15px]">{p.label}</span>
                      <span className="block font-mono text-[10px] text-ink-faint">
                        ≈ {fmtAr(Math.round(p.price / p.days), false)} / jour
                      </span>
                    </span>
                  </span>
                  <span className="font-display text-2xl font-semibold num">{fmtAr(p.price, false)}<span className="text-[13px] font-sans text-ink-faint"> Ar</span></span>
                </button>
              ))}

              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-faint pt-3">2 · Payez via</p>
              <div className="grid grid-cols-2 gap-3">
                {(["mvola", "airtel"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`border px-4 py-3.5 text-center transition-all ${
                      method === m ? (m === "mvola" ? "border-dgreen bg-dgreen/10" : "border-drouge bg-drouge/10") : "border-ink/15 bg-paper hover:border-ink/40"
                    }`}
                  >
                    <span className={`block font-mono text-[11px] uppercase tracking-[0.2em] font-semibold ${m === "mvola" ? "text-dgreen" : "text-drouge"}`}>
                      {m === "mvola" ? "Mvola" : "Airtel Money"}
                    </span>
                    <span className="block font-mono text-[12px] num mt-1">{m === "mvola" ? MVOLA_NUMBER : AIRTEL_NUMBER}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paiement */}
            <div className="relative border border-ink/15 bg-ink text-paper p-6 h-fit">
              <Corners className="text-gold-soft border-gold-soft" />
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-soft">3 · Envoyez puis confirmez</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[12px] text-paper/50">Montant à envoyer</p>
                  <p className="font-display text-3xl font-semibold num mt-1">{fmtAr(plan.price)}</p>
                </div>
                <div>
                  <p className="text-[12px] text-paper/50">Au numéro {method === "mvola" ? "Mvola" : "Airtel"}</p>
                  <div className="flex items-center justify-between border border-paper/20 px-4 py-3 mt-1.5">
                    <span className="font-mono num text-[16px]">{number}</span>
                    <button onClick={() => copy(number)} className="text-gold-soft hover:text-paper transition-colors" aria-label="Copier">
                      <CopyIcon size={17} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-paper/50">Référence de transaction</p>
                  <input
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    placeholder={method === "mvola" ? "MP240612.1045.A78945" : "123456789012"}
                    className="w-full bg-transparent border border-paper/20 focus:border-gold-soft px-4 py-3 mt-1.5 font-mono text-[14px] placeholder:text-paper/30 transition-colors"
                  />
                </div>
                <Btn variant="gold" onClick={verify} disabled={phase === "verif"} className="w-full">
                  <WalletIcon size={16} />
                  {phase === "verif" ? "Vérification…" : "J'ai payé — activer"}
                </Btn>
                <p className="text-center font-mono text-[10px] text-paper/40 tracking-wider">
                  Vérification automatique · Activation immédiate
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
