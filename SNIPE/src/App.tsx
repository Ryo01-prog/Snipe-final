import { useEffect, useState, type ReactNode } from "react";
import type { User } from "./lib/types";
import { OWNER_PHONE, fmtCountdown, subStatus, GAME_NAME, GAME_URL } from "./lib/engine";
import { getCurrentUser, setCurrent, updateUser } from "./lib/db";
import { Toaster, toast, useNow } from "./components/ui";
import {
  ChartIcon,
  CrownIcon,
  DownloadIcon,
  Logo,
  LogoutIcon,
  PowerIcon,
  ScanIcon,
  ShieldIcon,
  UserIcon,
} from "./components/icons";
import { NotificationCenter, SubBanner } from "./components/NotificationCenter";
import Auth from "./screens/Auth";
import Admin from "./screens/Admin";
import Paywall from "./screens/Paywall";
import Home from "./screens/Home";
import Stats from "./screens/Stats";
import Profile from "./screens/Profile";

type Tab = "home" | "stats" | "profile" | "admin";

function useInstallPrompt() {
  const [deferred, setDeferred] = useState<(Event & { prompt: () => void }) | null>(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia?.("(display-mode: standalone)").matches ?? false
  );
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as Event & { prompt: () => void });
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return { deferred, installed };
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [tab, setTab] = useState<Tab>("home");
  const [renewOpen, setRenewOpen] = useState(false);
  const now = useNow();
  const { deferred, installed } = useInstallPrompt();

  const update = (fn: (u: User) => User) => setUser((cur) => (cur ? updateUser(fn(cur)) : cur));

  const logout = () => {
    setCurrent(null);
    setUser(null);
    setTab("home");
    setRenewOpen(false);
  };

  if (!user) {
    return (
      <>
        <Auth onAuth={(u) => setUser(u)} />
        <Toaster />
      </>
    );
  }

  const isOwner = user.phone === OWNER_PHONE;
  const bypass = isOwner || user.vip === true;
  const status = subStatus(user, now);
  const locked = !bypass && !user.blocked && status.kind === "expired";
  const showPaywall = renewOpen || locked;

  const NAV: { id: Tab; num: string; label: string; icon: (s: number) => ReactNode }[] = [
    { id: "home", num: "01", label: "Accueil", icon: (s) => <ScanIcon size={s} /> },
    { id: "stats", num: "02", label: "Statistiques", icon: (s) => <ChartIcon size={s} /> },
    { id: "profile", num: "03", label: "Profil", icon: (s) => <UserIcon size={s} /> },
    ...(isOwner
      ? [{ id: "admin" as Tab, num: "04", label: "Console", icon: (s: number) => <ShieldIcon size={s} /> }]
      : []),
  ];

  const doInstall = () => {
    if (deferred) {
      deferred.prompt();
    } else {
      toast("Ouvrez le menu du navigateur puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».");
    }
  };

  return (
    <div className="min-h-screen">
      {/* ---------- Sidebar desktop ---------- */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[248px] flex-col border-r border-ink/12 bg-paper z-40">
        <div className="px-6 pt-7 pb-6 border-b border-ink/10">
          <Logo size={30} />
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setTab(n.id);
                setRenewOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group ${
                tab === n.id && !showPaywall
                  ? "bg-ink text-paper shadow-md"
                  : "text-ink-soft hover:bg-gold-pale/40 hover:translate-x-1"
              }`}
            >
              <span className={`font-mono text-[9px] tracking-[0.2em] ${tab === n.id && !showPaywall ? "text-gold-soft" : "text-ink-faint"}`}>
                {n.num}
              </span>
              {n.icon(16)}
              <span className="text-[14px] font-medium">{n.label}</span>
            </button>
          ))}
        </nav>

        {/* Widget abonnement / VIP */}
        <div className="px-4 pb-3">
          {bypass ? (
            <div className="relative border border-gold/50 bg-gold-pale/40 px-4 py-3.5 overflow-hidden">
              <CrownIcon size={54} className="absolute -right-2 -bottom-2 text-gold/15" />
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold-deep flex items-center gap-1.5">
                <CrownIcon size={11} /> {isOwner ? "Fondateur" : "Membre VIP"}
              </p>
              <p className="font-display text-lg font-semibold mt-1">Accès à vie</p>
              <p className="text-[10.5px] text-ink-faint leading-relaxed mt-0.5">
                Analyse, prédictions {isOwner ? "et console" : ""} — sans abonnement, sans limite.
              </p>
            </div>
          ) : (
            <div className="border border-ink/12 bg-ink text-paper px-4 py-3.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-paper/50">{status.label} · restant</p>
              <p className={`font-display text-xl font-semibold num mt-1 ${status.kind === "expired" ? "text-drouge" : status.msLeft < 24 * 3600000 ? "text-gold-soft" : "text-paper"}`}>
                {status.kind === "expired" ? "00:00:00" : fmtCountdown(status.msLeft)}
              </p>
              <button
                onClick={() => setRenewOpen(true)}
                className="mt-2.5 w-full bg-gold text-paper font-mono text-[10px] uppercase tracking-[0.16em] py-2 hover:bg-gold-deep transition-colors"
              >
                Renouveler
              </button>
            </div>
          )}
        </div>

        {/* Télécharger l'app */}
        <div className="px-4 pb-3">
          {installed ? (
            <p className="flex items-center justify-center gap-2 border border-dgreen/40 text-dgreen font-mono text-[10px] uppercase tracking-[0.16em] py-2">
              ✓ App installée
            </p>
          ) : (
            <button
              onClick={doInstall}
              className="w-full flex items-center justify-center gap-2 border border-ink/20 text-ink-soft font-mono text-[10px] uppercase tracking-[0.16em] py-2 hover:border-gold hover:text-gold-deep transition-all active:scale-[0.98]"
            >
              <DownloadIcon size={13} /> Télécharger l'app
            </button>
          )}
        </div>

        <div className="px-4 pb-5">
          <div className="flex items-center gap-2.5 border-t border-ink/10 pt-4">
            <span className="w-2 h-2 rounded-full bg-dgreen pulse-dot" />
            <span className="font-mono text-[11px] num text-ink-soft flex-1 truncate">{user.phone}</span>
            <button
              onClick={logout}
              aria-label="Se déconnecter"
              className="grid place-items-center w-8 h-8 border border-ink/12 text-ink-faint hover:text-drouge hover:border-drouge transition-all active:scale-90"
            >
              <LogoutIcon size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- En-tête mobile ---------- */}
      <header className="md:hidden sticky top-0 z-40 border-b border-ink/12 bg-paper/95 backdrop-blur px-4 py-3 flex items-center gap-2.5">
        <Logo size={24} />
        {user.vip && !isOwner && (
          <span className="flex items-center gap-1 border border-gold/60 bg-gold-pale/50 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-gold-deep">
            <CrownIcon size={9} /> VIP
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <NotificationCenter user={user} onRenew={() => setRenewOpen(true)} />
        </div>
      </header>

      {/* ---------- Contenu ---------- */}
      <div className="md:pl-[248px]">
        <main className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-28 md:pb-12">
          {showPaywall && !bypass ? (
            <div className="-mx-4 md:-mx-8 -mt-6 md:-mt-10">
              <Paywall
                user={user}
                onActivated={(u) => {
                  setUser(u);
                  setRenewOpen(false);
                }}
              />
            </div>
          ) : (
            <>
              <div className="hidden md:flex justify-end mb-6">
                <NotificationCenter user={user} onRenew={() => setRenewOpen(true)} />
              </div>
              {!user.blocked && <SubBanner user={user} onRenew={() => setRenewOpen(true)} />}
              <div key={tab} className="fadein">
                {tab === "home" && <Home user={user} update={update} onGoStats={() => setTab("stats")} />}
                {tab === "stats" && <Stats user={user} onGoHome={() => setTab("home")} />}
                {tab === "profile" && (
                  <Profile user={user} onUser={setUser} onRenew={() => setRenewOpen(true)} onLogout={logout} />
                )}
                {tab === "admin" && isOwner && <Admin owner={user} />}
              </div>

              {user.blocked && (
                <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-[2px] grid place-items-center px-5">
                  <div className="rise max-w-md w-full text-center border border-drouge/40 bg-paper px-8 py-12">
                    <span className="inline-grid place-items-center w-16 h-16 rounded-full border border-drouge/50 text-drouge mb-6">
                      <PowerIcon size={28} />
                    </span>
                    <h2 className="font-display text-3xl font-semibold">Accès suspendu</h2>
                    <p className="text-ink-faint mt-3 text-[15px] leading-relaxed">
                      Votre compte a été bloqué par l'administrateur en attendant la régularisation de
                      votre abonnement. Contactez-le pour réactiver l'accès.
                    </p>
                    <div className="flex gap-3 justify-center mt-8">
                      <button
                        onClick={() => setRenewOpen(true)}
                        className="bg-gold text-paper px-5 py-2.5 font-semibold hover:bg-gold-deep transition-colors"
                      >
                        Renouveler
                      </button>
                      <button
                        onClick={logout}
                        className="border border-ink/20 px-5 py-2.5 text-ink-soft hover:border-drouge hover:text-drouge transition-colors"
                      >
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <footer className="mt-14 pt-6 border-t border-ink/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">
              Snipe · analyse prédictive personnelle · Madagascar ·{" "}
              <a href={GAME_URL} target="_blank" rel="noreferrer" className="text-gold-deep hover:text-gold transition-colors">
                jeu : {GAME_NAME} (bet261.mg)
              </a>
            </p>
            <p className="font-mono text-[9px] text-ink-faint">
              Usage personnel · Les probabilités sont indicatives, aucun gain n'est garanti.
            </p>
          </footer>
        </main>
      </div>

      {/* ---------- Navigation basse mobile ---------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ink/12 bg-paper/95 backdrop-blur">
        <div className="grid grid-cols-3">
          {NAV.slice(0, 3).map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setTab(n.id);
                setRenewOpen(false);
              }}
              className={`flex flex-col items-center gap-1 py-3 transition-all active:scale-95 ${
                tab === n.id && !showPaywall ? "text-gold-deep" : "text-ink-faint"
              }`}
            >
              {n.icon(19)}
              <span className="font-mono text-[8.5px] uppercase tracking-[0.18em]">{n.label}</span>
            </button>
          ))}
        </div>
        {isOwner && (
          <button
            onClick={() => {
              setTab("admin");
              setRenewOpen(false);
            }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 border-t border-ink/8 font-mono text-[9px] uppercase tracking-[0.2em] transition-colors ${
              tab === "admin" ? "bg-ink text-gold-soft" : "text-ink-faint"
            }`}
          >
            <ShieldIcon size={13} /> Console
          </button>
        )}
      </nav>

      <Toaster />
    </div>
  );
}
