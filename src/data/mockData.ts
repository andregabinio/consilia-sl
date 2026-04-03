import { Lancamento, ResumoMensal } from "@/types/financeiro";

export const lancamentosMock: Lancamento[] = [];

export const maoDeObraMock = {
  contratado: 515562,
  realizado: 0,
  saldo: 515562,
  pagamentos: [] as { mes: string; valor: number; obs: string; responsavel: string }[],
};

export const administracaoMock = {
  contratado: 200000,
  realizadoAndre: 0,
  realizadoMarcos: 0,
  realizadoTotal: 0,
  saldo: 200000,
};

export const administracaoMock = {
  contratado: 200000,
  realizadoAndre: 45000,
  realizadoMarcos: 30000,
  realizadoTotal: 75000,
  saldo: 125000,
};

export const MESES_PT: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

export function formatMes(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MESES_PT[m]}/${ano}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
}
