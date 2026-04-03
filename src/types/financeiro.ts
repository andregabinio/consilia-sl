export type StatusDoc = "OK" | "-";
export type Pagador = "Roberto Menin" | "Feldman";
export type Modalidade = "Pix" | "Boleto" | "Cartão de Crédito";
export type TipoDocumento = "CP" | "CT" | "OR" | "NF";

export interface Lancamento {
  id: string;
  dataPedido: string;
  fornecedor: string;
  descricao: string;
  encaixes: number;
  desencaixes: number;
  dataPagamento: string;
  orcamento: StatusDoc;
  comprovante: StatusDoc;
  notaFiscal: StatusDoc;
  confirmado: StatusDoc;
  pagamento: Pagador;
  modalidade: Modalidade;
  observacoes: string;
  mes: string; // "2024-01"
}

export interface DocumentoAnexo {
  id: string;
  lancamentoId: string;
  tipo: TipoDocumento;
  nomeArquivo: string;
  url: string;
  dataCriacao: string;
}

export interface ExtratoLancamento {
  id: string;
  dataHora: string;
  nrDoc: string;
  historico: string;
  favorecido: string;
  cpfCnpj: string;
  valor: number;
  saldo: number;
  conciliadoComId?: string;
  statusConciliacao: "auto" | "manual" | "pendente";
}

export interface ResumoMensal {
  mes: string;
  encaixes: number;
  desencaixes: number;
  saldoMes: number;
  posicaoCaixa: number;
}

export interface MaoDeObra {
  contratado: number;
  realizado: number;
  saldo: number;
  pagamentos: { mes: string; valor: number; obs: string; responsavel: string }[];
}

export interface Administracao {
  contratado: number;
  realizadoAndre: number;
  realizadoMarcos: number;
  realizadoTotal: number;
  saldo: number;
}
