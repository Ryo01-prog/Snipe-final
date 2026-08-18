import { useState } from "react";
import type { PendingPayment, User } from "../lib/types";
import {
  AIRTEL_NUMBER,
  MVOLA_NUMBER,
  PLANS,
  fmtAr,
  fmtCountdown,
  fmtDate,
  fmtTimeHMS,
  maskPhone,
  subStatus,
  uid,
} from "../lib/engine";
import { allUsers, updateUser } from "../lib/db";
import { pushEvent } from "../lib/notifs";
import { Btn, SectionLabel, toast, useNow, useCountUp } from "../components/ui";
import {
  BellIcon,
  CheckIcon,
  ChevronDown,
  CrownIcon,
  PowerIcon,
  ShieldIcon,
  UserIcon,
  WalletIcon,
  XIcon,
} from "../components/icons";

export default function Admin({ owner }: { owner: User }) {
  const now = useNow();
  const [tick, setTick] = useState(0);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const users = allUsers().filter((u) => u.phone !== owner.phone);

  const active = users.filter((u) => !u.vip && !u.blocked && subStatus(u, now).kind === "active");
  const trial = users.filter((u) => !u.vip && !u.blocked && subStatus(u, now).kind === "trial");
  const expired = users.filter((u) => !u.vip && !u.blocked && subStatus(u, now).kind === "expired");
  const blocked = users.filter((u) => u.blocked);
  const vips = users.filter((u) => u.vip);
  const revenue = users.reduce((a, u) => a + u.payments.reduce((b, p) => b + p.amount, 0), 0);
  const revenueAnim = useCountUp(revenue, 1100);

  const mutate = (phone: string, fn: (u: User) => User) => {
    const target = allUsers().find((u) => u.phone === phone);
    if (!target) return;
    updateUser(fn(target));
    setTick((t) => t + 1);
  };

  const grant = (u: User, planIdx: number) => {
    const plan = PLANS[planIdx];
    mutate(u.phone, (x) => {
      const base = x.plan && x.plan.expiresAt > Date.now() ? x.plan.expiresAt : Date.now();
      return { ...x, blocked: false, plan: { id: plan.id, label: plan.label, expiresAt: base + plan.days * 86_400_000 } };
    });
    pushEvent(u.phone, "ok", "Accès accordé", `${plan.label} offerts par l'administrateur.`, `grant-${u.phone}-${Date.now()}`);
    toast(`${plan.label} accordés à ${maskPhone(u.phone)}.`);
  };

  const toggleVip = (u: User) => {
    const granting = !u.vip;
    mutate(u.phone, (x) => ({ ...x, vip: granting, blocked: false }));
    pushEvent(
      u.phone,
      granting ? "ok" : "warn",
      granting ? "Statut VIP accordé" : "Statut VIP retiré",
      granting
        ? "L'administrateur vous offre un accès illimité, jusqu'à nouvel ordre."
        : "L'administrateur a retiré votre statut VIP. Souscrivez une offre pour conserver l'accès.",
      `vip-${u.phone}-${Date.now()}`
    );
    toast(granting ? `${maskPhone(u.phone)} est maintenant VIP — accès illimité.` : `VIP retiré à ${maskPhone(u.phone)}.`);
  };

  /* ---- File de validation des paiements ---- */
  const pendings = users.flatMap((u) => (u.pendingPayments ?? []).map((p) => ({ u, p })));

  const approve = (phone: string, pp: PendingPayment) => {
    const plan = PLANS.find((x) => x.id === pp.planId);
    if (!plan) return;
    const payId = uid();
    mutate(phone, (x) => {
      const base = x.plan && x.plan.expiresAt > Date.now() ? x.plan.expiresAt : Date.now();
      return {
        ...x,
        blocked: false,
        plan: { id: plan.id, label: plan.label, expiresAt: base + plan.days * 86_400_000 },
        payments: [...x.payments, { id: payId, planId: pp.planId, amount: pp.amount, method: pp.method, ref: pp.ref, at: Date.now() }],
        pendingPayments: (x.pendingPayments ?? []).filter((q) => q.id !== pp.id),
      };
    });
    pushEvent(phone, "ok", "Paiement validé par l'administrateur", `Référence ${pp.ref} confirmée — ${plan.label} activés.`, `pay-${payId}`);
    toast(`Paiement de ${maskPhone(phone)} confirmé — ${plan.label} activés.`);
  };

  const reject = (phone: string, pp: PendingPayment) => {
    mutate(phone, (x) => ({ ...x, pendingPayments: (x.pendingPayments ?? []).filter((q) => q.id !== pp.id) }));
    pushEvent(phone, "err", "Paiement rejeté", `La référence ${pp.ref} n'a pas pu être confirmée. Vérifiez puis soumettez à nouveau.`, `reject-${pp.id}`);
    toast(`Référence ${pp.ref} rejetée.`, "err");
  };

  const stats = [
    { k: "Utilisateurs inscrits", v: String(users.length), icon: <UserIcon size={16} /> },
    { k: "Abonnés actifs", v: String(active.length), icon: <ShieldIcon size={16} />, gold: true },
    { k: "Membres VIP", v: String(vips.length), icon: <CrownIcon size={16} />, gold: true },
    { k: "Essais en cours", v: String(trial.length), icon: <BellIcon size={16} /> },
    { k: "Expirés (à prévenir)", v: String(expired.length), icon: <WalletIcon size={16} />, warn: true },
    { k: "Bloqués", v: String(blocked.length), icon: <PowerIcon size={16} />, red: true },
  ];

  return (
    <div className="space-y-10" data-tick={tick}>
      {/* File de validation */}
      <section className="rise">
        <SectionLabel
          right={
            pendings.length > 0 ? (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-gold-deep num">
                <span className="w-1.5 h-1.5 rounded-full bg-gold pulse-dot" /> {pendings.length} à valider
              </span>
            ) : (
              <span className="font-mono text-[10px] text-ink-faint">file vide</span>
            )
          }
        >
          Paiements en attente de validation
        </SectionLabel>
        {pendings.length === 0 ? (
          <div className="border border-dashed border-ink/20 px-5 py-5 text-[13px] text-ink-faint flex items-center gap-3">
            <ShieldIcon size={16} className="text-dgreen shrink-0" />
            Les références Mvola / Airtel reconnues activent l'abonnement automatiquement. Seules les
            références non reconnues arrivent ici pour validation manuelle.
          </div>
        ) : (
          <div className="border border-gold/50 bg-paper divide-y divide-ink/8">
            {pendings.map(({ u, p }) => (
              <div key={p.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 hover:bg-gold-pale/25 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[14px] font-medium num">{u.phone}</p>
                  <p className="font-mono text-[11px] text-ink-faint mt-0.5">
                    {fmtDate(p.at)} · {fmtTimeHMS(p.at)} · réf. <span className="text-ink">{p.ref}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-paper ${p.method === "mvola" ? "bg-dgreen" : "bg-drouge"}`}>
                    {p.method === "mvola" ? "Mvola" : "Airtel"}
                  </span>
                  <span className="font-mono num text-[13px] font-medium">{fmtAr(p.amount, false)}</span>
                  <span className="font-mono text-[10px] text-ink-faint">→ {PLANS.find((x) => x.id === p.planId)?.label}</span>
                </div>
                <div className="flex items-center gap-2 md:ml-4">
                  <Btn variant="ink" onClick={() => approve(u.phone, p)} className="!px-3.5 !py-2 text-[12px]">
                    <CheckIcon size={13} /> Confirmer & activer
                  </Btn>
                  <Btn variant="danger" onClick={() => reject(u.phone, p)} className="!px-3.5 !py-2 text-[12px]">
                    <XIcon size={13} /> Rejeter
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vue d'ensemble */}
      <section className="rise" style={{ animationDelay: "60ms" }}>
        <SectionLabel>Vue d'ensemble</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.k} className="border border-ink/12 bg-paper px-4 py-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
              <span className={`${s.red ? "text-drouge" : s.warn ? "text-gold-deep" : s.gold ? "text-gold-soft" : "text-ink-faint"}`}>{s.icon}</span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint mt-2.5 leading-tight">{s.k}</span>
              <p className={`font-display text-3xl font-semibold num mt-2 ${s.red ? "text-drouge" : s.warn ? "text-gold-deep" : s.gold ? "text-gold-soft" : ""}`}>{s.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 border border-ink/12 bg-paper px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Revenus cumulés (Mvola + Airtel)</span>
          <span className="font-display text-3xl font-semibold num text-dgreen">{fmtAr(revenueAnim, false)}</span>
        </div>
      </section>

      {/* Utilisateurs */}
      <section className="rise" style={{ animationDelay: "120ms" }}>
        <SectionLabel>Utilisateurs inscrits — abonnements & accès</SectionLabel>
        {users.length === 0 ? (
          <div className="border border-dashed border-ink/20 px-6 py-10 text-center text-sm text-ink-faint">
            Aucun utilisateur inscrit pour le moment. Les comptes créés sur l'app apparaîtront ici en temps réel.
          </div>
        ) : (
          <div className="border border-ink/12 bg-paper divide-y divide-ink/8">
            {users.map((u) => {
              const st = subStatus(u, now);
              const open = openRow === u.phone;
              const paid = u.payments.reduce((a, p) => a + p.amount, 0);
              return (
                <div key={u.phone} className={open ? "bg-gold-pale/25" : ""}>
                  <button
                    onClick={() => setOpenRow(open ? null : u.phone)}
                    className="w-full grid grid-cols-[1fr_auto] md:grid-cols-[1.2fr_0.8fr_0.9fr_0.7fr_auto] items-center gap-3 px-5 py-4 text-left hover:bg-gold-pale/25 transition-colors"
                  >
                    <span>
                      <span className="font-mono text-[14px] font-medium num block">{u.phone}</span>
                      <span className="font-mono text-[10px] text-ink-faint">inscrit {fmtDate(u.createdAt)}</span>
                    </span>
                    <span className="hidden md:block font-mono text-[11px] text-ink-faint num">
                      {u.sessions.length} sessions · {u.predictions.length} prédictions
                    </span>
                    <span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-paper ${
                          u.blocked ? "bg-drouge" : u.vip ? "bg-gold" : st.kind === "active" ? "bg-dgreen" : st.kind === "trial" ? "bg-ink-soft" : "bg-ink-faint"
                        }`}
                      >
                        {u.vip && !u.blocked && <CrownIcon size={10} />}
                        {u.blocked ? "Bloqué" : u.vip ? "VIP" : st.kind === "active" ? "Abonné" : st.kind === "trial" ? "Essai" : "Expiré"}
                      </span>
                      <span className="block font-mono text-[10px] text-ink-faint mt-1 num">
                        {u.blocked ? "accès suspendu par l'admin" : u.vip ? "accès illimité (VIP)" : st.kind === "expired" ? "accès verrouillé" : `reste ${fmtCountdown(st.msLeft)}`}
                      </span>
                    </span>
                    <span className="hidden md:block text-right font-mono num text-[13px]">{paid ? fmtAr(paid, false) : "—"}</span>
                    <ChevronDown size={16} className={`text-ink-faint transition-transform duration-300 justify-self-end ${open ? "rotate-180" : ""}`} />
                  </button>

                  {open && (
                    <div className="px-5 pb-5 fadein">
                      <div className="border border-ink/10 bg-paper p-4 grid md:grid-cols-2 gap-5">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint mb-2.5">Actions rapides</p>
                          <div className="flex flex-wrap gap-2">
                            <Btn
                              variant={u.blocked ? "gold" : "danger"}
                              onClick={() => {
                                const wasBlocked = u.blocked;
                                mutate(u.phone, (x) => ({ ...x, blocked: !x.blocked }));
                                pushEvent(
                                  u.phone,
                                  wasBlocked ? "ok" : "err",
                                  wasBlocked ? "Compte débloqué" : "Compte bloqué",
                                  wasBlocked
                                    ? "L'administrateur a réactivé votre accès."
                                    : "Accès suspendu par l'administrateur en attendant le paiement de votre abonnement.",
                                  `block-${u.phone}-${Date.now()}`
                                );
                                toast(wasBlocked ? `${maskPhone(u.phone)} débloqué.` : `${maskPhone(u.phone)} bloqué jusqu'au paiement.`);
                              }}
                              className="!px-4 !py-2 text-[12px]"
                            >
                              <PowerIcon size={13} /> {u.blocked ? "Débloquer" : "Bloquer"}
                            </Btn>
                            <Btn
                              variant="ghost"
                              onClick={() => {
                                pushEvent(
                                  u.phone,
                                  "warn",
                                  "Rappel de l'administrateur",
                                  st.kind === "expired"
                                    ? "Votre abonnement est expiré — renouvelez via Mvola ou Airtel pour continuer à utiliser Snipe."
                                    : `Votre accès expire bientôt (${fmtCountdown(st.msLeft)} restantes). Pensez à renouveler.`,
                                  `remind-${u.phone}-${Date.now()}`
                                );
                                toast(`Rappel de paiement envoyé à ${u.phone}.`);
                              }}
                              className="!px-4 !py-2 text-[12px]"
                            >
                              <BellIcon size={13} /> Prévenir
                            </Btn>
                            <Btn variant={u.vip ? "ink" : "gold"} onClick={() => toggleVip(u)} className="!px-4 !py-2 text-[12px]">
                              <CrownIcon size={13} /> {u.vip ? "Retirer VIP" : "+ VIP"}
                            </Btn>
                          </div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint mt-5 mb-2.5">
                            Accorder un accès (paiement reçu en main propre)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {PLANS.map((p, i) => (
                              <button
                                key={p.id}
                                onClick={() => grant(u, i)}
                                className="border border-ink/20 px-3 py-2 text-[12px] font-semibold hover:bg-ink hover:text-paper transition-all active:scale-95"
                              >
                                {p.label} · {p.price.toLocaleString("fr-FR")} Ar
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint mb-2.5">Paiements déclarés</p>
                          {u.payments.length === 0 ? (
                            <p className="text-[12px] text-ink-faint">Aucun paiement enregistré.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {[...u.payments].reverse().map((p) => (
                                <li key={p.id} className="flex items-center justify-between text-[12px] border border-ink/8 px-3 py-2">
                                  <span className="font-mono text-[11px] text-ink-faint">{p.ref}</span>
                                  <span className="flex items-center gap-3">
                                    <span className={`px-1.5 py-0.5 font-mono text-[8px] uppercase text-paper ${p.method === "mvola" ? "bg-dgreen" : "bg-drouge"}`}>{p.method}</span>
                                    <span className="font-mono num font-medium">{fmtAr(p.amount, false)}</span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {!u.vip && st.kind === "active" && u.plan && (
                            <p className="mt-3 text-[12px] text-ink-faint">
                              Abonnement <strong className="text-ink">{u.plan.label}</strong> — expire le {fmtDate(u.plan.expiresAt)}{" "}
                              (<span className="num">{fmtCountdown(st.msLeft)}</span> restantes).
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-[11px] text-ink-faint leading-relaxed border-l-2 border-gold/50 pl-3 max-w-xl">
        Règle appliquée automatiquement : à l'expiration du délai (essai 1 h, 3, 7 ou 30 jours),
        l'utilisateur ne peut plus lancer d'analyse tant qu'il n'a pas payé via Mvola{" "}
        <span className="font-mono num">{MVOLA_NUMBER}</span> ou Airtel{" "}
        <span className="font-mono num">{AIRTEL_NUMBER}</span>. Son compte, lui, reste inscrit. En tant
        que fondateur, vos analyses et prédictions restent disponibles depuis les onglets 01 et 02 — accès à vie.
      </p>
    </div>
  );
}
