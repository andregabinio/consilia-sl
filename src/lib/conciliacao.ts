import { Lancamento } from "@/types/financeiro";

export type ConfidenceLevel = "alta" | "media" | "baixa" | "manual";

export interface ExtratoItem {
  id: string;
  data: string;
  historico: string;
  favorecido: string;
  valor: number;
  status: "auto" | "manual" | "pendente";
  confianca: ConfidenceLevel;
  parId?: string;
  sugestaoParId?: string;
  alertas?: string[];
}

export interface PlanilhaItem {
  id: string;
  fornecedor: string;
  valor: number;
  data: string;
  status: "auto" | "manual" | "pendente" | "nao-encontrado";
  parId?: string;
  modalidade?: string;
  observacoes?: string;
}

const STOP_WORDS = ["ltda", "me", "cia", "sa", "s/a", "epp", "eireli", "de", "e", "da", "do", "dos", "das"];

function normalizeWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-záàâãéèêíïóôõúç\s]/gi, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.includes(w));
}

function fuzzyNameMatch(extFavorecido: string, planFornecedor: string): boolean {
  const extWords = normalizeWords(extFavorecido);
  const planWords = normalizeWords(planFornecedor);
  if (extWords.length === 0 || planWords.length === 0) return false;
  return extWords.some(ew => planWords.some(pw =>
    pw.includes(ew) || ew.includes(pw) || levenshtein(ew, pw) <= 2
  ));
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}

function dateDiffDays(d1: string, d2: string): number {
  const a = new Date(d1 + "T12:00:00");
  const b = new Date(d2 + "T12:00:00");
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

// Mock extrato data for demo
const extratoRaw = [
  { id: "e1", data: "2024-01-10", historico: "DEB PIX CHAVE", favorecido: "MARCOS NOAL CONSTRUCOES", valor: -18500 },
  { id: "e2", data: "2024-01-15", historico: "PAG BOLETO IBC", favorecido: "LEROY MERLIN", valor: -3250 },
  { id: "e3", data: "2024-01-20", historico: "PAG BOLETO IBC", favorecido: "ELETRO CENTER COM", valor: -4780 },
  { id: "e4", data: "2024-01-28", historico: "PAG LUZ/GAS IBC", favorecido: "COPEL DISTRIBUICAO", valor: -450 },
  { id: "e5", data: "2024-01-08", historico: "CRED PIX CHAVE", favorecido: "ROBERTO LUCAS MENI", valor: 50000 },
  { id: "e6", data: "2024-01-22", historico: "DEB PIX CHAVE", favorecido: "FERRETUDO LTDA", valor: -1200 },
  { id: "e7", data: "2024-01-30", historico: "TARIFA MANUT CONTA", favorecido: "", valor: -25 },
];

export function matchExtrato(lancamentos: Lancamento[]): { extrato: ExtratoItem[]; planilha: PlanilhaItem[] } {
  const lancJan = lancamentos.filter(l => l.mes === "2024-01");

  const planilhaItems: PlanilhaItem[] = lancJan.map(l => ({
    id: l.id,
    fornecedor: l.fornecedor,
    valor: l.encaixes > 0 ? l.encaixes : l.desencaixes,
    data: l.dataPagamento,
    status: "pendente" as const,
    modalidade: l.modalidade,
    observacoes: l.observacoes,
  }));

  const extratoItems: ExtratoItem[] = extratoRaw.map(e => ({
    ...e,
    status: "pendente" as const,
    confianca: "baixa" as ConfidenceLevel,
    alertas: [] as string[],
  }));

  const usedPlanilha = new Set<string>();

  // Pass 1: High confidence (all 3 criteria)
  for (const ext of extratoItems) {
    if (ext.status !== "pendente") continue;
    for (const plan of planilhaItems) {
      if (usedPlanilha.has(plan.id)) continue;
      const valorMatch = Math.abs(ext.valor - plan.valor) < 0.01;
      const dateMatch = dateDiffDays(ext.data, plan.data) <= 3;
      const nameMatch = fuzzyNameMatch(ext.favorecido, plan.fornecedor);

      if (valorMatch && dateMatch && nameMatch) {
        ext.status = "auto";
        ext.confianca = "alta";
        ext.parId = plan.id;
        plan.status = "auto";
        plan.parId = ext.id;
        usedPlanilha.add(plan.id);
        break;
      }
    }
  }

  // Pass 2: Medium confidence (2 of 3)
  for (const ext of extratoItems) {
    if (ext.status !== "pendente") continue;
    const alertas: string[] = [];

    for (const plan of planilhaItems) {
      if (usedPlanilha.has(plan.id)) continue;
      const valorMatch = Math.abs(ext.valor - plan.valor) < 0.01;
      const dateMatch = dateDiffDays(ext.data, plan.data) <= 3;
      const nameMatch = fuzzyNameMatch(ext.favorecido, plan.fornecedor);
      const matchCount = [valorMatch, dateMatch, nameMatch].filter(Boolean).length;

      if (matchCount === 2) {
        ext.confianca = "media";
        ext.sugestaoParId = plan.id;

        if (plan.modalidade === "Cartão de Crédito") {
          alertas.push("Cartão de crédito — vincule manualmente");
        }
        if (plan.observacoes && /\d+\/\d+/.test(plan.observacoes)) {
          alertas.push("Parcelamento detectado");
        }
        break;
      }
    }

    // Special case: credit entry (aporte)
    if (ext.valor > 0 && ext.historico.includes("CRED PIX") && ext.status === "pendente") {
      const aporte = planilhaItems.find(p =>
        !usedPlanilha.has(p.id) && p.valor > 0 && Math.abs(p.valor - ext.valor) < 0.01
      );
      if (aporte) {
        ext.confianca = "media";
        ext.sugestaoParId = aporte.id;
        alertas.push("Possível aporte do proprietário — confirme manualmente");
      }
    }

    ext.alertas = alertas;
  }

  // Mark planilha items not found in extrato
  for (const plan of planilhaItems) {
    if (!usedPlanilha.has(plan.id) && plan.status === "pendente" && !extratoItems.some(e => e.sugestaoParId === plan.id)) {
      plan.status = "nao-encontrado";
    }
  }

  return { extrato: extratoItems, planilha: planilhaItems };
}
