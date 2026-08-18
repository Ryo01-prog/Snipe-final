/**
 * Couleurs prédites — seuils « supérieur à » :
 *   violet  > ×2   ·  rose  > ×5   ·  orange  > ×10
 */
export type GameColor = "violet" | "rose" | "orange";

export type SignalType = "ecart" | "serie" | "frequence";

export interface Round {
  index: number;
  time: string;
  color: GameColor;
  multiplier: number;
  hex: string;
  decimal: number;
  net: number;
  id?: string;
  ts?: number;
}

export interface SessionImage {
  name: string;
  size: number;
  dataUrl?: string;
  seed?: number;
}

export interface Session {
  id: string;
  createdAt: number;
  stake: number;
  rounds: Round[];
  images?: SessionImage[];
  last: {
    dateLabel: string;
    time: string;
    hex: string;
    decimal: number;
    multiplier: number;
    color: GameColor;
  };
}

export type PredStatus = "attente" | "exact" | "partiel" | "manque";

export interface Prediction {
  id: string;
  sessionId: string;
  createdAt: number;
  index: number;
  ts: number;
  time: string;
  color: GameColor;
  /** probabilité couleur (%) */
  colorProb: number;
  multMin: number;
  multMax: number;
  /** confiance modèle (%) */
  confidence: number;
  signal: string;
  signalType?: SignalType;
  status: PredStatus;
}

export type PayMethod = "mvola" | "airtel";

export interface Payment {
  id: string;
  planId: string;
  amount: number;
  method: PayMethod;
  ref: string;
  at: number;
}

export interface PendingPayment {
  id: string;
  planId: string;
  amount: number;
  method: PayMethod;
  ref: string;
  at: number;
}

export interface Plan {
  id: string;
  label: string;
  days: number;
  price: number;
}

export interface User {
  phone: string;
  pass: string;
  createdAt: number;
  trialEndsAt: number;
  plan: { id: string; label: string; expiresAt: number } | null;
  /** accès illimité accordé par l'admin */
  vip?: boolean;
  blocked: boolean;
  sessions: Session[];
  predictions: Prediction[];
  payments: Payment[];
  pendingPayments?: PendingPayment[];
}
