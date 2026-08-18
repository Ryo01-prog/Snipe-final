import type { User } from "./types";

const USERS_KEY = "snipe.users.v1";
const CURRENT_KEY = "snipe.current.v1";
/** Mémoire des comptes supprimés : le numéro ne retrouve jamais l'essai gratuit. */
const BLACKLIST_KEY = "snipe.blacklist.v1";
const HOUR = 3600_000;

function readUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as User[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readBlacklist(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BLACKLIST_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function writeBlacklist(bl: Record<string, number>) {
  localStorage.setItem(BLACKLIST_KEY, JSON.stringify(bl));
}

/** Ce numéro a-t-il déjà été inscrit puis supprimé ? */
export function wasDeleted(phone: string): boolean {
  return phone in readBlacklist();
}

export function allUsers(): User[] {
  return readUsers();
}

export function findByPhone(phone: string): User | null {
  return readUsers().find((u) => u.phone === phone) ?? null;
}

export function register(
  phone: string,
  pass: string
): { ok: boolean; error?: string; user?: User; burnedTrial?: boolean } {
  const users = readUsers();
  if (users.some((u) => u.phone === phone)) {
    return { ok: false, error: "Ce numéro est déjà inscrit. Connectez-vous." };
  }
  const now = Date.now();
  // Un compte supprimé puis réinscrit ne profite PLUS du mode gratuit.
  const burned = phone in readBlacklist();
  const user: User = {
    phone,
    pass: btoa(unescape(encodeURIComponent(pass))),
    createdAt: now,
    trialEndsAt: burned ? now : now + HOUR,
    plan: null,
    blocked: false,
    sessions: [],
    predictions: [],
    payments: [],
  };
  users.push(user);
  writeUsers(users);
  setCurrent(phone);
  return { ok: true, user, burnedTrial: burned };
}

export function login(
  phone: string,
  pass: string
): { ok: boolean; error?: string; user?: User } {
  const user = findByPhone(phone);
  if (!user) return { ok: false, error: "Aucun compte avec ce numéro." };
  const enc = btoa(unescape(encodeURIComponent(pass)));
  if (user.pass !== enc) return { ok: false, error: "Mot de passe incorrect." };
  setCurrent(phone);
  return { ok: true, user };
}

export function setCurrent(phone: string | null) {
  if (phone) localStorage.setItem(CURRENT_KEY, phone);
  else localStorage.removeItem(CURRENT_KEY);
}

export function getCurrentUser(): User | null {
  const phone = localStorage.getItem(CURRENT_KEY);
  if (!phone) return null;
  return findByPhone(phone);
}

export function updateUser(user: User): User {
  const users = readUsers();
  const i = users.findIndex((u) => u.phone === user.phone);
  if (i >= 0) users[i] = user;
  else users.push(user);
  writeUsers(users);
  return user;
}

export function deleteUser(phone: string) {
  writeUsers(readUsers().filter((u) => u.phone !== phone));
  const bl = readBlacklist();
  bl[phone] = Date.now();
  writeBlacklist(bl);
  const cur = localStorage.getItem(CURRENT_KEY);
  if (cur === phone) localStorage.removeItem(CURRENT_KEY);
}
