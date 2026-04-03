import { Lancamento, ResumoMensal } from "@/types/financeiro";

export const lancamentosMock: Lancamento[] = [
  // Janeiro 2024
  { id: "1", dataPedido: "2024-01-05", fornecedor: "Marcos Noal", descricao: "Mão de obra - Janeiro", encaixes: 0, desencaixes: -18500, dataPagamento: "2024-01-10", orcamento: "OK", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Feldman", modalidade: "Pix", observacoes: "", mes: "2024-01" },
  { id: "2", dataPedido: "2024-01-08", fornecedor: "Roberto Menin", descricao: "Aporte mensal", encaixes: 50000, desencaixes: 0, dataPagamento: "2024-01-08", orcamento: "-", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Roberto Menin", modalidade: "Pix", observacoes: "", mes: "2024-01" },
  { id: "3", dataPedido: "2024-01-12", fornecedor: "Leroy Merlin", descricao: "Material hidráulico", encaixes: 0, desencaixes: -3250, dataPagamento: "2024-01-15", orcamento: "OK", comprovante: "OK", notaFiscal: "OK", confirmado: "OK", pagamento: "Feldman", modalidade: "Cartão de Crédito", observacoes: "", mes: "2024-01" },
  { id: "4", dataPedido: "2024-01-18", fornecedor: "Eletro Center", descricao: "Material elétrico", encaixes: 0, desencaixes: -4780, dataPagamento: "2024-01-20", orcamento: "OK", comprovante: "OK", notaFiscal: "OK", confirmado: "-", pagamento: "Feldman", modalidade: "Boleto", observacoes: "1/2 - R$2.390,00", mes: "2024-01" },
  { id: "5", dataPedido: "2024-01-25", fornecedor: "Copel", descricao: "Energia elétrica obra", encaixes: 0, desencaixes: -450, dataPagamento: "2024-01-28", orcamento: "-", comprovante: "OK", notaFiscal: "OK", confirmado: "OK", pagamento: "Feldman", modalidade: "Boleto", observacoes: "", mes: "2024-01" },
  // Fevereiro 2024
  { id: "6", dataPedido: "2024-02-02", fornecedor: "Roberto Menin", descricao: "Aporte mensal", encaixes: 50000, desencaixes: 0, dataPagamento: "2024-02-02", orcamento: "-", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Roberto Menin", modalidade: "Pix", observacoes: "", mes: "2024-02" },
  { id: "7", dataPedido: "2024-02-05", fornecedor: "Marcos Noal", descricao: "Mão de obra - Fevereiro", encaixes: 0, desencaixes: -18500, dataPagamento: "2024-02-10", orcamento: "OK", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Feldman", modalidade: "Pix", observacoes: "", mes: "2024-02" },
  { id: "8", dataPedido: "2024-02-10", fornecedor: "Madeireira São José", descricao: "Madeira para telhado", encaixes: 0, desencaixes: -12350, dataPagamento: "2024-02-15", orcamento: "OK", comprovante: "OK", notaFiscal: "OK", confirmado: "OK", pagamento: "Feldman", modalidade: "Boleto", observacoes: "", mes: "2024-02" },
  { id: "9", dataPedido: "2024-02-20", fornecedor: "Telhas Paraná", descricao: "Telhas cerâmicas", encaixes: 0, desencaixes: -8900, dataPagamento: "2024-02-22", orcamento: "OK", comprovante: "-", notaFiscal: "OK", confirmado: "-", pagamento: "Feldman", modalidade: "Pix", observacoes: "Entrega parcial", mes: "2024-02" },
  // Março 2024
  { id: "10", dataPedido: "2024-03-01", fornecedor: "Roberto Menin", descricao: "Aporte mensal", encaixes: 55000, desencaixes: 0, dataPagamento: "2024-03-01", orcamento: "-", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Roberto Menin", modalidade: "Pix", observacoes: "", mes: "2024-03" },
  { id: "11", dataPedido: "2024-03-05", fornecedor: "Marcos Noal", descricao: "Mão de obra - Março", encaixes: 0, desencaixes: -18500, dataPagamento: "2024-03-10", orcamento: "OK", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Feldman", modalidade: "Pix", observacoes: "", mes: "2024-03" },
  { id: "12", dataPedido: "2024-03-12", fornecedor: "Deca", descricao: "Louças sanitárias", encaixes: 0, desencaixes: -6780, dataPagamento: "2024-03-18", orcamento: "OK", comprovante: "OK", notaFiscal: "OK", confirmado: "OK", pagamento: "Feldman", modalidade: "Cartão de Crédito", observacoes: "1/3 - R$2.260,00", mes: "2024-03" },
  { id: "13", dataPedido: "2024-03-22", fornecedor: "Vidraçaria Central", descricao: "Vidros temperados", encaixes: 0, desencaixes: -15400, dataPagamento: "2024-03-25", orcamento: "OK", comprovante: "OK", notaFiscal: "OK", confirmado: "-", pagamento: "Feldman", modalidade: "Boleto", observacoes: "", mes: "2024-03" },
  // Abril 2024
  { id: "14", dataPedido: "2024-04-01", fornecedor: "Roberto Menin", descricao: "Aporte mensal", encaixes: 45000, desencaixes: 0, dataPagamento: "2024-04-01", orcamento: "-", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Roberto Menin", modalidade: "Pix", observacoes: "", mes: "2024-04" },
  { id: "15", dataPedido: "2024-04-05", fornecedor: "Marcos Noal", descricao: "Mão de obra - Abril", encaixes: 0, desencaixes: -18500, dataPagamento: "2024-04-10", orcamento: "OK", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Feldman", modalidade: "Pix", observacoes: "", mes: "2024-04" },
  { id: "16", dataPedido: "2024-04-15", fornecedor: "Tintas Coral", descricao: "Tintas e acabamento", encaixes: 0, desencaixes: -5200, dataPagamento: "2024-04-18", orcamento: "OK", comprovante: "OK", notaFiscal: "OK", confirmado: "OK", pagamento: "Feldman", modalidade: "Pix", observacoes: "", mes: "2024-04" },
  // Maio 2024
  { id: "17", dataPedido: "2024-05-01", fornecedor: "Roberto Menin", descricao: "Aporte mensal", encaixes: 50000, desencaixes: 0, dataPagamento: "2024-05-01", orcamento: "-", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Roberto Menin", modalidade: "Pix", observacoes: "", mes: "2024-05" },
  { id: "18", dataPedido: "2024-05-05", fornecedor: "Marcos Noal", descricao: "Mão de obra - Maio", encaixes: 0, desencaixes: -18500, dataPagamento: "2024-05-10", orcamento: "OK", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Feldman", modalidade: "Pix", observacoes: "", mes: "2024-05" },
  { id: "19", dataPedido: "2024-05-18", fornecedor: "Porcelanato Shop", descricao: "Porcelanato 60x60", encaixes: 0, desencaixes: -9800, dataPagamento: "2024-05-22", orcamento: "OK", comprovante: "-", notaFiscal: "OK", confirmado: "-", pagamento: "Feldman", modalidade: "Boleto", observacoes: "", mes: "2024-05" },
  // Junho 2024
  { id: "20", dataPedido: "2024-06-01", fornecedor: "Roberto Menin", descricao: "Aporte mensal", encaixes: 50000, desencaixes: 0, dataPagamento: "2024-06-01", orcamento: "-", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Roberto Menin", modalidade: "Pix", observacoes: "", mes: "2024-06" },
  { id: "21", dataPedido: "2024-06-05", fornecedor: "Marcos Noal", descricao: "Mão de obra - Junho", encaixes: 0, desencaixes: -18500, dataPagamento: "2024-06-10", orcamento: "OK", comprovante: "OK", notaFiscal: "-", confirmado: "OK", pagamento: "Feldman", modalidade: "Pix", observacoes: "", mes: "2024-06" },
  { id: "22", dataPedido: "2024-06-14", fornecedor: "Serralheria Aço Forte", descricao: "Portão e grades", encaixes: 0, desencaixes: -22000, dataPagamento: "2024-06-20", orcamento: "OK", comprovante: "OK", notaFiscal: "OK", confirmado: "OK", pagamento: "Feldman", modalidade: "Pix", observacoes: "1/2 - R$11.000,00", mes: "2024-06" },
  { id: "23", dataPedido: "2024-06-25", fornecedor: "Copel", descricao: "Energia elétrica obra", encaixes: 0, desencaixes: -520, dataPagamento: "2024-06-28", orcamento: "-", comprovante: "OK", notaFiscal: "OK", confirmado: "OK", pagamento: "Feldman", modalidade: "Boleto", observacoes: "", mes: "2024-06" },
];

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

export const maoDeObraMock = {
  contratado: 515562,
  realizado: 111000,
  saldo: 404562,
  pagamentos: [
    { mes: "Janeiro/2024", valor: 18500, obs: "", responsavel: "Feldman" },
    { mes: "Fevereiro/2024", valor: 18500, obs: "", responsavel: "Feldman" },
    { mes: "Março/2024", valor: 18500, obs: "", responsavel: "Feldman" },
    { mes: "Abril/2024", valor: 18500, obs: "", responsavel: "Feldman" },
    { mes: "Maio/2024", valor: 18500, obs: "", responsavel: "Feldman" },
    { mes: "Junho/2024", valor: 18500, obs: "", responsavel: "Feldman" },
  ],
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
