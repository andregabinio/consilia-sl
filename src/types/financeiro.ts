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

// Tipos para conciliacao com Supabase
export interface Upload {
  id: string;
  tipo: "extrato" | "comprovante";
  nome_arquivo: string;
  storage_path: string;
  status: "pendente" | "processando" | "concluido" | "erro";
  erro_msg: string | null;
  created_at: string;
}

export interface ExtratoItemDB {
  id: string;
  upload_id: string;
  data: string;
  historico: string | null;
  favorecido: string | null;
  cpf_cnpj: string | null;
  valor: number;
  saldo: number | null;
  nr_doc: string | null;
}

export interface ComprovanteDB {
  id: string;
  upload_id: string;
  tipo_pagamento: string | null;
  data: string;
  valor: number;
  favorecido: string | null;
  cpf_cnpj: string | null;
  banco: string | null;
  id_transacao: string | null;
  dados_brutos: Record<string, unknown> | null;
}

export interface ConciliacaoDB {
  id: string;
  extrato_item_id: string;
  comprovante_id: string | null;
  confianca: "alta" | "media" | "baixa";
  metodo: "auto" | "manual";
  criterios_match: Record<string, boolean> | null;
  created_at: string;
}
