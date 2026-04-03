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

export function calcularResumosMensais(lancamentos: Lancamento[]): ResumoMensal[] {
  const mesesMap = new Map<string, { encaixes: number; desencaixes: number }>();

  lancamentos.forEach((l) => {
    const current = mesesMap.get(l.mes) || { encaixes: 0, desencaixes: 0 };
    current.encaixes += l.encaixes;
    current.desencaixes += l.desencaixes;
    mesesMap.set(l.mes, current);
  });

  const meses = Array.from(mesesMap.keys()).sort();
  let acumulado = 0;

  return meses.map((mes) => {
    const data = mesesMap.get(mes)!;
    const saldoMes = data.encaixes + data.desencaixes;
    acumulado += saldoMes;
    return { mes, encaixes: data.encaixes, desencaixes: data.desencaixes, saldoMes, posicaoCaixa: acumulado };
  });
}

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
