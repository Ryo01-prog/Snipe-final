import { useMemo, useState } from "react";
import type { User } from "../lib/types";
import {
  fmtAr,
  fmtCountdown,
  fmtDate,
  fmtTimeHMS,
  OWNER_PHONE,
  PLANS,
  sessionsToCSV,
  download,
  maskPhone,
  subStatus,
} from "../lib/engine";
import { deleteUser, updateUser } from "../lib/db";
import { pushEvent } from "../lib/notifs";
import { Btn, ConfirmModal, Corners, SectionLabel, toast, useNow } from "../components/ui";
import {
  CheckIcon,
  ChevronDown,
  ClockIcon,
  CrownIcon,
  DownloadIcon,
  LogoutIcon,
  ResetIcon,
  ShieldIcon,
  TrashIcon,
  WalletIcon,
} from "../components/icons";

export default function Profile({
  user,
  onUser,
  onRenew,
  onLogout,
}: {
  user: User;
  onUser: (u: User) => void;
  onRenew: () => void;
  onLogout: () => void;
}) {
  const now = useNow();
  const status = subStatus(user, now);
  const isOwner = user.phone === OWNER_PHONE;
  const isVip = user.vip === true;
  const [showPhone, setShowPhone] = useState(false);
  const [confirm, setConfirm] = useState<"reset" | "delete" | null>(null);
  const [openSessions, setOpenSessions] = useState(false);

  const totalNet = useMemo(
    () => user.sessions.reduce((a, s) => a + s.rounds.reduce((b, r) => b + r.net, 0), 0),
    [user.sessions]
  );

  const resetData = () => {
    const next = updateUser({ ...user, sessions: [], predictions: [] });
    onUser(next);
    setConfirm(null);
    toast("Données d'analyse réinitialisées. Votre abonnement reste actif.");
  };

  const deleteAccount = () => {
    pushEvent(user.phone, "err", "Compte supprimé", "Le numéro reste en mémoire : l'essai gratuit ne sera plus offert.", `del-${user.phone}`);
    deleteUser(user.phone);
    setConfirm(null);
    toast("Compte supprimé. Ce numéro ne retrouvera pas l'essai gratuit.", "info");
    onLogout();
  };

  const exportCSV = () => {
    if (!user.sessions.length) {
      toast("Aucune session à exporter pour le moment.", "err");
      return;
    }
    download(`snipe-sessions-${user.phone}.csv`, sessionsToCSV(user.sessions), "text/csv;charset=utf-8");
    toast(`${user.sessions.length} session(s) exportée(s) en CSV.`);
  };

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Compte */}
      <section className="rise">
        <SectionLabel>Informations du compte</SectionLabel>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative border border-ink/12 bg-paper px-5 py-5">
            <Corners className="text-gold/40 border-gold/40" />
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">Numéro de téléphone</p>
            <p className="font-display text-2xl font-semibold num mt-1.5 flex items-center gap-3">
              {showPhone ? user.phone : maskPhone(user.phone)}
              <button
                onClick={() => setShowPhone(!showPhone)}
                className="font-mono text-[10px] uppercase tracking-wider text-gold-deep border border-gold/40 px-2 py-0.5 hover:bg-gold hover:text-paper transition-all"
              >
                {showPhone ? "Masquer" : "Afficher"}
              </button>
            </p>
            <p className="text-[11px] text-ink-faint mt-2">Inscrit le {fmtDate(user.createdAt)}</p>
          </div>
          <div className="border border-ink/12 bg-paper px-5 py-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">Activité</p>
            <div className="flex items-end gap-6 mt-1.5">
              <div>
                <p className="font-display text-2xl font-semibold num">{user.sessions.length}</p>
                <p className="text-[11px] text-ink-faint">sessions</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold num">{user.predictions.length}</p>
                <p className="text-[11px] text-ink-faint">prédictions</p>
              </div>
              <div>
                <p className={`font-display text-2xl font-semibold num ${totalNet >= 0 ? "text-dgreen" : "text-drouge"}`}>
                  {fmtAr(totalNet, false)}
                </p>
                <p className="text-[11px] text-ink-faint">net simulé</p>
              </div>
            </div>
          </div>
        </div>
        {(isOwner || isVip) && (
          <div className="relative mt-4 border border-gold/60 bg-gold-pale/40 px-5 py-4 flex items-center gap-4 overflow-hidden">
            <CrownIcon size={70} className="absolute -right-3 -bottom-4 text-gold/15" />
            <span className="inline-grid place-items-center w-10 h-10 border border-gold/60 text-gold-deep shrink-0">
              <CrownIcon size={19} />
            </span>
            <div>
              <p className="font-semibold text-[15px]">{isOwner ? "Compte fondateur — accès à vie" : "Membre VIP — accès illimité"}</p>
              <p className="text-[12px] text-ink-faint mt-0.5">
                {isOwner
                  ? "Analyse, prédictions et console administrateur, sans abonnement ni échéance."
                  : "Accès accordé par l'administrateur, sans échéance tant que le statut est maintenu."}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Abonnement */}
      <section className="rise" style={{ animationDelay: "60ms" }}>
        <SectionLabel>{isOwner || isVip ? "Accès" : "Abonnement"}</SectionLabel>
        <div className="relative border border-ink/12 bg-ink text-paper px-5 py-5 overflow-hidden">
          <span className="absolute top-4 right-4 font-mono text-[9px] uppercase tracking-[0.2em] text-paper/40">
            SNP-{user.phone.slice(-4)}
          </span>
          <ShieldIcon size={120} className="absolute -right-6 -bottom-6 text-gold/10" />
          {isOwner || isVip ? (
            <div className="relative flex flex-col sm:flex-row sm:items-end gap-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-soft flex items-center gap-2">
                  <ShieldIcon size={12} /> {isOwner ? "Compte fondateur" : "Statut VIP"}
                </p>
                <p className="font-display text-4xl font-semibold mt-2 leading-none text-gold-soft">Accès à vie</p>
                <p className="text-[12px] text-paper/50 mt-2.5 max-w-sm leading-relaxed">
                  Aucun abonnement requis : import de captures, analyses et prédictions — illimités.
                </p>
              </div>
              <div className="sm:ml-auto">
                <span className="inline-flex items-center gap-2 border border-gold/50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-gold-soft">
                  <span className="w-1.5 h-1.5 rounded-full bg-dgreen pulse-dot" /> Illimité
                </span>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-col sm:flex-row sm:items-end gap-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">Temps restant</p>
                <p className={`font-display text-4xl font-semibold num mt-2 leading-none ${status.kind === "trial" ? "text-gold-soft" : status.kind === "expired" ? "text-drouge" : "text-paper"}`}>
                  {status.kind === "expired" ? "00:00:00" : fmtCountdown(status.msLeft)}
                </p>
                <p className="text-[12px] text-paper/50 mt-2.5">
                  {status.kind === "trial" && "Essai gratuit de 1 h offert à l'inscription."}
                  {status.kind === "active" && user.plan &&
                    `Offre ${user.plan.label} — expire le ${fmtDate(user.plan.expiresAt)} à ${fmtTimeHMS(user.plan.expiresAt)}.`}
                  {status.kind === "expired" && "Accès expiré — renouvelez pour continuer."}
                </p>
              </div>
              <div className="sm:ml-auto flex flex-col gap-2.5">
                <Btn variant="gold" onClick={onRenew}>
                  <WalletIcon size={15} /> Renouveler / prolonger
                </Btn>
                <p className="font-mono text-[10px] text-paper/40 text-center">
                  dès {fmtAr(PLANS[0].price, false)} · Mvola & Airtel
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Historique des paiements */}
        {user.payments.length > 0 && (
          <div className="border border-ink/12 bg-paper divide-y divide-ink/8 mt-4">
            {[...user.payments].reverse().map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gold-pale/25 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-paper ${p.method === "mvola" ? "bg-dgreen" : "bg-drouge"}`}>
                    {p.method === "mvola" ? "Mvola" : "Airtel"}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-semibold">{PLANS.find((x) => x.id === p.planId)?.label}</p>
                    <p className="font-mono text-[10px] text-ink-faint">{fmtDate(p.at)} · réf. {p.ref}</p>
                  </div>
                </div>
                <span className="font-mono num font-semibold text-[14px]">{fmtAr(p.amount, false)} Ar</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historique des sessions */}
      <section className="rise" style={{ animationDelay: "100ms" }}>
        <SectionLabel
          right={
            <div className="flex gap-2">
              <button onClick={exportCSV} className="flex items-center gap-1.5 border border-ink/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft hover:border-gold hover:text-gold-deep transition-all">
                <DownloadIcon size={12} /> CSV
              </button>
              <button onClick={() => setOpenSessions(!openSessions)} className="flex items-center gap-1.5 border border-ink/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft hover:border-gold hover:text-gold-deep transition-all">
                Consulter <ChevronDown size={12} className={`transition-transform ${openSessions ? "rotate-180" : ""}`} />
              </button>
            </div>
          }
        >
          Historique des sessions importées
        </SectionLabel>
        {user.sessions.length === 0 ? (
          <div className="border border-dashed border-ink/20 px-6 py-8 text-center text-[13.5px] text-ink-faint">
            Aucune session importée pour le moment.
          </div>
        ) : (
          <div className="border border-ink/12 bg-paper divide-y divide-ink/8">
            {[...user.sessions].reverse().map((s) => {
              const net = s.rounds.reduce((a, r) => a + r.net, 0);
              return (
                <div key={s.id} className="px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 hover:bg-gold-pale/25 transition-colors">
                  <span className="font-mono text-[10px] text-ink-faint num">#{s.id.slice(0, 6)}</span>
                  <span className="text-[13.5px] font-semibold">{fmtDate(s.createdAt)}</span>
                  <span className="font-mono text-[11px] text-ink-faint num">{s.rounds.length} manches</span>
                  <span className="font-mono text-[11px] text-ink-faint num">
                    dernière : {s.last.time} · {fmtAr(s.last.multiplier, false).replace(" Ar", "")}×
                  </span>
                  <span className={`ml-auto font-mono num font-semibold text-[13px] ${net >= 0 ? "text-dgreen" : "text-drouge"}`}>
                    {fmtAr(net, false)} Ar
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Gestion des données */}
      <section className="rise" style={{ animationDelay: "140ms" }}>
        <SectionLabel>Gestion des données</SectionLabel>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-ink/12 bg-paper px-5 py-5">
            <p className="font-semibold text-[15px] flex items-center gap-2">
              <ResetIcon size={16} className="text-gold-deep" /> Réinitialiser mes analyses
            </p>
            <p className="text-[12.5px] text-ink-faint mt-1.5 leading-relaxed">
              Efface vos sessions et prédictions. Votre compte et votre abonnement restent intacts.
            </p>
            <Btn variant="ghost" onClick={() => setConfirm("reset")} className="mt-4">
              Réinitialiser
            </Btn>
          </div>
          <div className="border border-drouge/40 bg-paper px-5 py-5">
            <p className="font-semibold text-[15px] flex items-center gap-2">
              <TrashIcon size={16} className="text-drouge" /> Supprimer mon compte
            </p>
            <p className="text-[12.5px] text-ink-faint mt-1.5 leading-relaxed">
              Supprime définitivement votre compte. <strong className="text-drouge">L'app se souvient de ce numéro</strong> :
              en cas de réinscription, l'essai gratuit d'1 h ne sera plus offert.
            </p>
            <Btn variant="danger" onClick={() => setConfirm("delete")} className="mt-4">
              Supprimer mon compte
            </Btn>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Btn variant="ghost" onClick={onLogout}>
            <LogoutIcon size={15} /> Se déconnecter
          </Btn>
        </div>
      </section>

      {confirm === "reset" && (
        <ConfirmModal
          title="Réinitialiser les analyses ?"
          body="Toutes vos sessions importées et vos prédictions seront effacées. Cette action est irréversible, mais votre compte et votre abonnement restent actifs."
          confirmLabel="Réinitialiser"
          danger
          onConfirm={resetData}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "delete" && (
        <ConfirmModal
          title="Supprimer définitivement votre compte ?"
          body={
            <>
              Votre compte, vos sessions et vos prédictions seront supprimés.{" "}
              <strong className="text-drouge">Ce numéro restera en mémoire</strong> : si vous vous
              réinscrivez, l'essai gratuit d'1 h ne sera pas accordé à nouveau.
            </>
          }
          confirmLabel="Supprimer mon compte"
          danger
          onConfirm={deleteAccount}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
