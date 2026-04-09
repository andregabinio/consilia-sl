// src/lib/conciliacao.ts
// Logica de match migrou para Edge Function "conciliar"
// Este arquivo mantem apenas tipos usados pelo frontend

export type ConfidenceLevel = "alta" | "media" | "baixa";

export type ConciliacaoStatus = "auto" | "manual" | "pendente";
