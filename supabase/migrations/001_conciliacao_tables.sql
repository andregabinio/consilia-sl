-- 001_conciliacao_tables.sql
-- Tabelas para conciliacao bancaria com OCR

CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('extrato', 'comprovante')),
  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
  erro_msg text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extratos_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  data date NOT NULL,
  historico text,
  favorecido text,
  cpf_cnpj text,
  valor numeric NOT NULL,
  saldo numeric,
  nr_doc text
);

CREATE TABLE IF NOT EXISTS comprovantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  tipo_pagamento text,
  data date NOT NULL,
  valor numeric NOT NULL,
  favorecido text,
  cpf_cnpj text,
  banco text,
  id_transacao text,
  dados_brutos jsonb
);

CREATE TABLE IF NOT EXISTS conciliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrato_item_id uuid UNIQUE REFERENCES extratos_itens(id) ON DELETE CASCADE,
  comprovante_id uuid REFERENCES comprovantes(id) ON DELETE CASCADE,
  confianca text NOT NULL CHECK (confianca IN ('alta', 'media', 'baixa')),
  metodo text NOT NULL CHECK (metodo IN ('auto', 'manual')),
  criterios_match jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_extratos_itens_upload ON extratos_itens(upload_id);
CREATE INDEX idx_comprovantes_upload ON comprovantes(upload_id);
CREATE INDEX idx_conciliacoes_extrato ON conciliacoes(extrato_item_id);
CREATE INDEX idx_conciliacoes_comprovante ON conciliacoes(comprovante_id);

-- Storage bucket para PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: allow all on documentos bucket (no auth for now)
CREATE POLICY "allow_all_documentos" ON storage.objects
  FOR ALL USING (bucket_id = 'documentos')
  WITH CHECK (bucket_id = 'documentos');
