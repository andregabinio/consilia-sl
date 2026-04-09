# Conciliacao OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir upload de PDFs (extrato CEF + comprovantes), extrair dados via Claude Vision (Haiku 4.5), e cruzar automaticamente as transacoes com niveis de confianca.

**Architecture:** Frontend React envia PDFs pro Supabase Storage. Edge Functions processam cada PDF com Claude Vision para extrair dados estruturados. Uma terceira Edge Function cruza extrato vs comprovantes usando match por valor/data/nome. Resultado volta pro frontend via queries no Supabase.

**Tech Stack:** React + Vite + Tailwind + shadcn/ui (frontend), Supabase self-hosted (Storage + PostgreSQL + Edge Functions), Claude Haiku 4.5 Vision API (OCR)

---

## File Structure

### Backend (Edge Functions)
- **Create:** `/root/supabase/docker/volumes/functions/processar-extrato/index.ts` — recebe upload_id, le PDF do Storage, envia pro Claude Vision, salva itens extraidos
- **Create:** `/root/supabase/docker/volumes/functions/processar-comprovante/index.ts` — recebe upload_id, le PDF do Storage, envia pro Claude Vision, salva comprovante extraido
- **Create:** `/root/supabase/docker/volumes/functions/conciliar/index.ts` — recebe lista de IDs, executa logica de match em 3 passes, salva conciliacoes
- **Modify:** `/root/supabase/docker/volumes/functions/_shared/cors.ts` — adicionar dominio do Lovable na lista de origens
- **Create:** `/root/supabase/docker/volumes/functions/_shared/claude-vision.ts` — cliente reutilizavel para Claude Vision com suporte a PDF base64

### Frontend (React)
- **Create:** `src/components/conciliacao/FileDropzone.tsx` — componente de drag & drop para upload de PDF
- **Create:** `src/components/conciliacao/ProcessingStatus.tsx` — barra de progresso do processamento OCR
- **Modify:** `src/pages/Conciliacao.tsx` — refatorar para usar upload real + dados do Supabase
- **Modify:** `src/components/conciliacao/ConciliacaoLista.tsx` — adaptar para dados reais, adicionar link pro PDF
- **Create:** `src/lib/supabase.ts` — cliente Supabase para o frontend
- **Modify:** `src/lib/conciliacao.ts` — remover mock data, manter apenas tipos/interfaces
- **Modify:** `src/types/financeiro.ts` — adicionar tipos de conciliacao do banco

### SQL
- **Create:** `supabase/migrations/001_conciliacao_tables.sql` — DDL das 4 tabelas + bucket storage

---

## Task 1: Criar tabelas no PostgreSQL

**Files:**
- Create: `supabase/migrations/001_conciliacao_tables.sql`

- [ ] **Step 1: Escrever migration SQL**

```sql
-- 001_conciliacao_tables.sql
-- Tabelas para conciliacao bancaria com OCR

-- Enum-like checks via text + constraint
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
  comprovante_id uuid UNIQUE REFERENCES comprovantes(id) ON DELETE CASCADE,
  confianca text NOT NULL CHECK (confianca IN ('alta', 'media', 'baixa')),
  metodo text NOT NULL CHECK (metodo IN ('auto', 'manual')),
  criterios_match jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indices para queries frequentes
CREATE INDEX idx_extratos_itens_upload ON extratos_itens(upload_id);
CREATE INDEX idx_comprovantes_upload ON comprovantes(upload_id);
CREATE INDEX idx_conciliacoes_extrato ON conciliacoes(extrato_item_id);
CREATE INDEX idx_conciliacoes_comprovante ON conciliacoes(comprovante_id);

-- Storage bucket para PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: acesso publico ao bucket (sem auth por enquanto)
CREATE POLICY "allow_all_documentos" ON storage.objects
  FOR ALL USING (bucket_id = 'documentos')
  WITH CHECK (bucket_id = 'documentos');
```

- [ ] **Step 2: Executar migration no banco**

Run:
```bash
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /root/consilia-sl/supabase/migrations/001_conciliacao_tables.sql
```

Expected: tabelas criadas sem erro.

- [ ] **Step 3: Verificar tabelas criadas**

Run:
```bash
docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "\dt uploads; \dt extratos_itens; \dt comprovantes; \dt conciliacoes;"
```

Expected: 4 tabelas listadas.

- [ ] **Step 4: Commit**

```bash
cd /root/consilia-sl
git add supabase/migrations/001_conciliacao_tables.sql
git commit -m "feat: add database tables for conciliacao OCR"
```

---

## Task 2: Criar cliente Claude Vision compartilhado

**Files:**
- Create: `/root/supabase/docker/volumes/functions/_shared/claude-vision.ts`
- Modify: `/root/supabase/docker/volumes/functions/_shared/cors.ts`

- [ ] **Step 1: Criar claude-vision.ts**

```typescript
// claude-vision.ts — Cliente para Claude Vision API com suporte a PDF
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 4096;
const TIMEOUT_MS = 60_000;

export interface VisionResult {
  success: boolean;
  data: unknown;
  error?: string;
}

export async function extractFromPdf(
  pdfBase64: string,
  prompt: string
): Promise<VisionResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return { success: false, data: null, error: "ANTHROPIC_API_KEY not set" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (response.status === 429 || response.status >= 500) {
      console.warn(`[claude-vision] ${response.status}, retrying in 5s...`);
      await new Promise((r) => setTimeout(r, 5_000));
      return extractFromPdf(pdfBase64, prompt);
    }

    if (!response.ok) {
      const body = await response.text();
      console.error(`[claude-vision] API error: ${response.status} - ${body}`);
      return { success: false, data: null, error: `API ${response.status}: ${body}` };
    }

    const result = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const text = result.content?.[0]?.text;
    if (!text) {
      return { success: false, data: null, error: "Empty response from Claude" };
    }

    // Extrair JSON da resposta (pode vir com ```json wrapper)
    const jsonMatch = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, data: null, error: `No JSON in response: ${text.substring(0, 200)}` };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return { success: true, data: parsed };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return { success: false, data: null, error: "Request timed out (60s)" };
    }
    return { success: false, data: null, error: (err as Error).message };
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 2: Adicionar dominio do Lovable ao cors.ts**

Adicionar o dominio do projeto Lovable na lista `ALLOWED_ORIGINS` em `/root/supabase/docker/volumes/functions/_shared/cors.ts`. O dominio exato sera fornecido pelo usuario (formato: `https://<id>.lovable.app`). Por enquanto adicionar wildcard temporario:

No arquivo `cors.ts`, adicionar na lista ALLOWED_ORIGINS:
```typescript
"https://consilia-sl.lovable.app",
```

Nota: o dominio exato sera ajustado quando o usuario confirmar a URL do Lovable.

- [ ] **Step 3: Commit os arquivos da shared**

```bash
cd /root/supabase/docker/volumes/functions
git add _shared/claude-vision.ts _shared/cors.ts || true
# Esses arquivos nao estao no repo consilia-sl, entao apenas garantir que estao salvos
```

---

## Task 3: Edge Function — processar-extrato

**Files:**
- Create: `/root/supabase/docker/volumes/functions/processar-extrato/index.ts`

- [ ] **Step 1: Criar a Edge Function**

```typescript
import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";
import { extractFromPdf } from "../_shared/claude-vision.ts";

const PROMPT_EXTRATO = `Extraia todas as transacoes deste extrato bancario da Caixa Economica Federal.
Para cada linha de transacao retorne um objeto JSON com estes campos:
- data: string no formato "YYYY-MM-DD"
- historico: string com a descricao da transacao (ex: "DEB PIX CHAVE", "PAG BOLETO")
- favorecido: string com o nome do favorecido/beneficiario
- cpf_cnpj: string com CPF ou CNPJ se disponivel, senao null
- valor: number (negativo para debitos, positivo para creditos)
- saldo: number com o saldo apos a transacao, se disponivel, senao null
- nr_doc: string com o numero do documento se disponivel, senao null

Retorne APENAS um JSON array valido, sem texto adicional, sem markdown.
Exemplo: [{"data":"2024-01-10","historico":"DEB PIX CHAVE","favorecido":"JOAO SILVA","cpf_cnpj":"123.456.789-00","valor":-1500.00,"saldo":8500.00,"nr_doc":"123456"}]`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { upload_id } = await req.json();
    if (!upload_id) {
      return new Response(JSON.stringify({ error: "upload_id required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    // Atualizar status para processando
    await supabase.from("uploads").update({ status: "processando" }).eq("id", upload_id);

    // Buscar info do upload
    const { data: upload, error: uploadErr } = await supabase
      .from("uploads")
      .select("storage_path")
      .eq("id", upload_id)
      .single();

    if (uploadErr || !upload) {
      throw new Error(`Upload not found: ${uploadErr?.message}`);
    }

    // Baixar PDF do Storage
    const { data: fileData, error: fileErr } = await supabase.storage
      .from("documentos")
      .download(upload.storage_path);

    if (fileErr || !fileData) {
      throw new Error(`File download failed: ${fileErr?.message}`);
    }

    // Converter para base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Enviar para Claude Vision
    const result = await extractFromPdf(base64, PROMPT_EXTRATO);

    if (!result.success) {
      await supabase.from("uploads").update({ status: "erro", erro_msg: result.error }).eq("id", upload_id);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Inserir itens extraidos
    const itens = (result.data as Array<Record<string, unknown>>).map((item) => ({
      upload_id,
      data: item.data,
      historico: item.historico || null,
      favorecido: item.favorecido || null,
      cpf_cnpj: item.cpf_cnpj || null,
      valor: item.valor,
      saldo: item.saldo ?? null,
      nr_doc: item.nr_doc || null,
    }));

    const { error: insertErr } = await supabase.from("extratos_itens").insert(itens);
    if (insertErr) {
      throw new Error(`Insert failed: ${insertErr.message}`);
    }

    // Atualizar status
    await supabase.from("uploads").update({ status: "concluido" }).eq("id", upload_id);

    return new Response(JSON.stringify({ success: true, count: itens.length }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[processar-extrato]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Commit**

Arquivo salvo diretamente no volume de funcoes. Nao faz parte do repo Git do consilia-sl.

---

## Task 4: Edge Function — processar-comprovante

**Files:**
- Create: `/root/supabase/docker/volumes/functions/processar-comprovante/index.ts`

- [ ] **Step 1: Criar a Edge Function**

```typescript
import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";
import { extractFromPdf } from "../_shared/claude-vision.ts";

const PROMPT_COMPROVANTE = `Extraia os dados deste comprovante de pagamento brasileiro.
Retorne um JSON object com estes campos:
- tipo_pagamento: string ("Pix", "Boleto", "TED", "DOC", "Cartao", ou "Outro")
- data: string no formato "YYYY-MM-DD"
- valor: number (sempre positivo)
- favorecido: string com o nome de quem recebeu o pagamento
- cpf_cnpj: string com CPF ou CNPJ do recebedor se disponivel, senao null
- banco: string com o nome do banco de origem se disponivel, senao null
- id_transacao: string com o codigo/ID da transacao se disponivel, senao null

Retorne APENAS um JSON object valido, sem texto adicional, sem markdown.
Exemplo: {"tipo_pagamento":"Pix","data":"2024-01-10","valor":1500.00,"favorecido":"JOAO SILVA","cpf_cnpj":"12.345.678/0001-90","banco":"Caixa","id_transacao":"E123456"}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { upload_id } = await req.json();
    if (!upload_id) {
      return new Response(JSON.stringify({ error: "upload_id required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    await supabase.from("uploads").update({ status: "processando" }).eq("id", upload_id);

    const { data: upload, error: uploadErr } = await supabase
      .from("uploads")
      .select("storage_path")
      .eq("id", upload_id)
      .single();

    if (uploadErr || !upload) {
      throw new Error(`Upload not found: ${uploadErr?.message}`);
    }

    const { data: fileData, error: fileErr } = await supabase.storage
      .from("documentos")
      .download(upload.storage_path);

    if (fileErr || !fileData) {
      throw new Error(`File download failed: ${fileErr?.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const result = await extractFromPdf(base64, PROMPT_COMPROVANTE);

    if (!result.success) {
      await supabase.from("uploads").update({ status: "erro", erro_msg: result.error }).eq("id", upload_id);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const item = result.data as Record<string, unknown>;
    const { error: insertErr } = await supabase.from("comprovantes").insert({
      upload_id,
      tipo_pagamento: item.tipo_pagamento || null,
      data: item.data,
      valor: item.valor,
      favorecido: item.favorecido || null,
      cpf_cnpj: item.cpf_cnpj || null,
      banco: item.banco || null,
      id_transacao: item.id_transacao || null,
      dados_brutos: item,
    });

    if (insertErr) {
      throw new Error(`Insert failed: ${insertErr.message}`);
    }

    await supabase.from("uploads").update({ status: "concluido" }).eq("id", upload_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[processar-comprovante]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Commit**

Arquivo salvo diretamente no volume de funcoes.

---

## Task 5: Edge Function — conciliar

**Files:**
- Create: `/root/supabase/docker/volumes/functions/conciliar/index.ts`

- [ ] **Step 1: Criar a Edge Function**

```typescript
import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";

interface ExtratoRow {
  id: string;
  data: string;
  historico: string | null;
  favorecido: string | null;
  cpf_cnpj: string | null;
  valor: number;
}

interface ComprovanteRow {
  id: string;
  data: string;
  valor: number;
  favorecido: string | null;
  cpf_cnpj: string | null;
}

const STOP_WORDS = ["ltda", "me", "cia", "sa", "s/a", "epp", "eireli", "de", "e", "da", "do", "dos", "das"];

function normalizeWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-záàâãéèêíïóôõúç\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.includes(w));
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

function fuzzyNameMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const wordsA = normalizeWords(a);
  const wordsB = normalizeWords(b);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  return wordsA.some((wa) => wordsB.some((wb) => wb.includes(wa) || wa.includes(wb) || levenshtein(wa, wb) <= 2));
}

function cpfCnpjMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const cleanA = a.replace(/\D/g, "");
  const cleanB = b.replace(/\D/g, "");
  return cleanA.length >= 11 && cleanB.length >= 11 && cleanA === cleanB;
}

function dateDiffDays(d1: string, d2: string): number {
  const a = new Date(d1 + "T12:00:00");
  const b = new Date(d2 + "T12:00:00");
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function valorMatch(v1: number, v2: number): boolean {
  return Math.abs(Math.abs(v1) - Math.abs(v2)) < 0.01;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);

  try {
    const { extrato_upload_id } = await req.json();
    if (!extrato_upload_id) {
      return new Response(JSON.stringify({ error: "extrato_upload_id required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    // Buscar itens do extrato
    const { data: extratoItens, error: extErr } = await supabase
      .from("extratos_itens")
      .select("id, data, historico, favorecido, cpf_cnpj, valor")
      .eq("upload_id", extrato_upload_id);

    if (extErr) throw new Error(`Extrato query failed: ${extErr.message}`);

    // Buscar todos os comprovantes com uploads concluidos
    const { data: comprovantes, error: compErr } = await supabase
      .from("comprovantes")
      .select("id, data, valor, favorecido, cpf_cnpj, upload_id");

    if (compErr) throw new Error(`Comprovantes query failed: ${compErr.message}`);

    // Limpar conciliacoes anteriores para este extrato
    const extratoIds = (extratoItens as ExtratoRow[]).map((e) => e.id);
    if (extratoIds.length > 0) {
      await supabase.from("conciliacoes").delete().in("extrato_item_id", extratoIds);
    }

    const usedComprovantes = new Set<string>();
    const conciliacoes: Array<{
      extrato_item_id: string;
      comprovante_id: string;
      confianca: string;
      metodo: string;
      criterios_match: Record<string, boolean>;
    }> = [];

    const extrato = extratoItens as ExtratoRow[];
    const comps = comprovantes as ComprovanteRow[];

    // Pass 1: Confianca Alta (3/3 criterios ou CPF/CNPJ + valor)
    for (const ext of extrato) {
      for (const comp of comps) {
        if (usedComprovantes.has(comp.id)) continue;

        const vMatch = valorMatch(ext.valor, comp.valor);
        const dMatch = dateDiffDays(ext.data, comp.data) <= 1;
        const nMatch = fuzzyNameMatch(ext.favorecido, comp.favorecido);
        const docMatch = cpfCnpjMatch(ext.cpf_cnpj, comp.cpf_cnpj);

        if (vMatch && dMatch && (nMatch || docMatch)) {
          conciliacoes.push({
            extrato_item_id: ext.id,
            comprovante_id: comp.id,
            confianca: "alta",
            metodo: "auto",
            criterios_match: { valor: vMatch, data: dMatch, nome: nMatch, cpf_cnpj: docMatch },
          });
          usedComprovantes.add(comp.id);
          break;
        }
      }
    }

    const conciliadosExtrato = new Set(conciliacoes.map((c) => c.extrato_item_id));

    // Pass 2: Confianca Media (2/3 criterios)
    for (const ext of extrato) {
      if (conciliadosExtrato.has(ext.id)) continue;

      for (const comp of comps) {
        if (usedComprovantes.has(comp.id)) continue;

        const vMatch = valorMatch(ext.valor, comp.valor);
        const dMatch = dateDiffDays(ext.data, comp.data) <= 5;
        const nMatch = fuzzyNameMatch(ext.favorecido, comp.favorecido);
        const docMatch = cpfCnpjMatch(ext.cpf_cnpj, comp.cpf_cnpj);
        const matchCount = [vMatch, dMatch, nMatch || docMatch].filter(Boolean).length;

        if (matchCount >= 2) {
          conciliacoes.push({
            extrato_item_id: ext.id,
            comprovante_id: comp.id,
            confianca: "media",
            metodo: "auto",
            criterios_match: { valor: vMatch, data: dMatch, nome: nMatch, cpf_cnpj: docMatch },
          });
          usedComprovantes.add(comp.id);
          conciliadosExtrato.add(ext.id);
          break;
        }
      }
    }

    // Inserir conciliacoes
    if (conciliacoes.length > 0) {
      const { error: insErr } = await supabase.from("conciliacoes").insert(conciliacoes);
      if (insErr) throw new Error(`Insert conciliacoes failed: ${insErr.message}`);
    }

    const stats = {
      total_extrato: extrato.length,
      total_comprovantes: comps.length,
      alta: conciliacoes.filter((c) => c.confianca === "alta").length,
      media: conciliacoes.filter((c) => c.confianca === "media").length,
      sem_match: extrato.length - conciliadosExtrato.size,
    };

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[conciliar]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Registrar funcoes no config.toml**

Adicionar ao `/root/supabase/docker/volumes/functions/config.toml`:

```toml
[functions.processar-extrato]
verify_jwt = false

[functions.processar-comprovante]
verify_jwt = false

[functions.conciliar]
verify_jwt = false
```

- [ ] **Step 3: Reiniciar Edge Runtime**

Run:
```bash
docker service update supabase_functions --force
```

Expected: servico atualizado sem erro.

- [ ] **Step 4: Testar funcoes estao acessiveis**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/functions/v1/processar-extrato
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/functions/v1/processar-comprovante
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/functions/v1/conciliar
```

Expected: 400 (bad request, pois nao enviamos body — mas mostra que a funcao esta rodando).

- [ ] **Step 5: Commit**

Arquivos salvos no volume Docker. Nao fazem parte do repo Git consilia-sl.

---

## Task 6: Cliente Supabase no frontend

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Instalar dependencia**

Run:
```bash
cd /root/consilia-sl && npm install @supabase/supabase-js
```

- [ ] **Step 2: Criar cliente**

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

- [ ] **Step 3: Criar .env com variaveis**

Criar `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://<supabase-url>
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Nota: o usuario deve preencher com a URL e chave do Supabase self-hosted acessivel externamente (via Kong/Nginx).

- [ ] **Step 4: Adicionar .env ao .gitignore**

Verificar se `.env` ja esta no `.gitignore`. Se nao, adicionar.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add Supabase client for frontend"
```

---

## Task 7: Componente FileDropzone

**Files:**
- Create: `src/components/conciliacao/FileDropzone.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// src/components/conciliacao/FileDropzone.tsx
import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileDropzoneProps {
  label: string;
  description: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export default function FileDropzone({ label, description, multiple = false, files, onFilesChange }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
      if (dropped.length === 0) return;
      onFilesChange(multiple ? [...files, ...dropped] : [dropped[0]]);
    },
    [files, multiple, onFilesChange]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length === 0) return;
      onFilesChange(multiple ? [...files, ...selected] : [selected[0]]);
      e.target.value = "";
    },
    [files, multiple, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
        `}
        onClick={() => document.getElementById(`file-input-${label}`)?.click()}
      >
        <input
          id={`file-input-${label}`}
          type="file"
          accept="application/pdf"
          multiple={multiple}
          onChange={handleSelect}
          className="hidden"
        />
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/conciliacao/FileDropzone.tsx
git commit -m "feat: add FileDropzone component for PDF upload"
```

---

## Task 8: Componente ProcessingStatus

**Files:**
- Create: `src/components/conciliacao/ProcessingStatus.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// src/components/conciliacao/ProcessingStatus.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

interface UploadStatus {
  id: string;
  nome_arquivo: string;
  status: "pendente" | "processando" | "concluido" | "erro";
  erro_msg?: string;
}

interface ProcessingStatusProps {
  uploads: UploadStatus[];
}

export default function ProcessingStatus({ uploads }: ProcessingStatusProps) {
  const total = uploads.length;
  const concluidos = uploads.filter((u) => u.status === "concluido").length;
  const erros = uploads.filter((u) => u.status === "erro").length;
  const progresso = total > 0 ? Math.round(((concluidos + erros) / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Processando documentos...</p>
          <span className="text-sm text-muted-foreground">{concluidos}/{total}</span>
        </div>
        <Progress value={progresso} className="h-2" />
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-2 text-sm">
              {u.status === "concluido" && <CheckCircle className="w-4 h-4 text-success" />}
              {u.status === "processando" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              {u.status === "pendente" && <Loader2 className="w-4 h-4 text-muted-foreground" />}
              {u.status === "erro" && <XCircle className="w-4 h-4 text-destructive" />}
              <span className="flex-1 truncate">{u.nome_arquivo}</span>
              {u.status === "erro" && (
                <span className="text-xs text-destructive">{u.erro_msg}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/conciliacao/ProcessingStatus.tsx
git commit -m "feat: add ProcessingStatus component"
```

---

## Task 9: Atualizar tipos do financeiro

**Files:**
- Modify: `src/types/financeiro.ts`
- Modify: `src/lib/conciliacao.ts`

- [ ] **Step 1: Adicionar tipos de banco em financeiro.ts**

Adicionar ao final de `src/types/financeiro.ts`:

```typescript
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
  comprovante_id: string;
  confianca: "alta" | "media" | "baixa";
  metodo: "auto" | "manual";
  criterios_match: Record<string, boolean> | null;
  created_at: string;
}
```

- [ ] **Step 2: Simplificar conciliacao.ts**

Substituir todo o conteudo de `src/lib/conciliacao.ts` por apenas re-exports dos tipos (a logica de match agora roda no backend):

```typescript
// src/lib/conciliacao.ts
// Logica de match migrou para Edge Function "conciliar"
// Este arquivo mantem apenas tipos usados pelo frontend

export type ConfidenceLevel = "alta" | "media" | "baixa";

export type ConciliacaoStatus = "auto" | "manual" | "pendente";
```

- [ ] **Step 3: Commit**

```bash
git add src/types/financeiro.ts src/lib/conciliacao.ts
git commit -m "feat: update types for Supabase conciliacao, remove mock match logic"
```

---

## Task 10: Refatorar pagina Conciliacao.tsx

**Files:**
- Modify: `src/pages/Conciliacao.tsx`

- [ ] **Step 1: Reescrever Conciliacao.tsx com upload real**

Substituir todo o conteudo de `src/pages/Conciliacao.tsx`:

```tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileCheck, Link2, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Upload as UploadType, ExtratoItemDB, ComprovanteDB, ConciliacaoDB } from "@/types/financeiro";
import FileDropzone from "@/components/conciliacao/FileDropzone";
import ProcessingStatus from "@/components/conciliacao/ProcessingStatus";
import ConciliacaoLista from "@/components/conciliacao/ConciliacaoLista";
import ConciliacaoResumo from "@/components/conciliacao/ConciliacaoResumo";

type Stage = "upload" | "processing" | "result";

export default function Conciliacao() {
  const [stage, setStage] = useState<Stage>("upload");
  const [extratoFiles, setExtratoFiles] = useState<File[]>([]);
  const [comprovanteFiles, setComprovanteFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<UploadType[]>([]);
  const [extratoItens, setExtratoItens] = useState<ExtratoItemDB[]>([]);
  const [comprovantes, setComprovantes] = useState<ComprovanteDB[]>([]);
  const [conciliacoes, setConciliacoes] = useState<ConciliacaoDB[]>([]);
  const [extratoUploadId, setExtratoUploadId] = useState<string | null>(null);
  const [selectedExtrato, setSelectedExtrato] = useState<string | null>(null);
  const [selectedComprovante, setSelectedComprovante] = useState<string | null>(null);

  const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";

  // Upload files to Storage + create upload records + trigger processing
  const handleProcessar = useCallback(async () => {
    if (extratoFiles.length === 0) return;
    setStage("processing");

    const allFiles = [
      ...extratoFiles.map((f) => ({ file: f, tipo: "extrato" as const })),
      ...comprovanteFiles.map((f) => ({ file: f, tipo: "comprovante" as const })),
    ];

    const uploadRecords: UploadType[] = [];

    for (const { file, tipo } of allFiles) {
      const path = `${tipo}s/${Date.now()}-${file.name}`;

      // Upload para Storage
      const { error: storageErr } = await supabase.storage
        .from("documentos")
        .upload(path, file, { contentType: "application/pdf" });

      if (storageErr) {
        console.error("Storage upload failed:", storageErr);
        continue;
      }

      // Criar registro na tabela uploads
      const { data: uploadRow, error: dbErr } = await supabase
        .from("uploads")
        .insert({ tipo, nome_arquivo: file.name, storage_path: path, status: "pendente" })
        .select()
        .single();

      if (dbErr || !uploadRow) {
        console.error("DB insert failed:", dbErr);
        continue;
      }

      uploadRecords.push(uploadRow as UploadType);

      if (tipo === "extrato") {
        setExtratoUploadId(uploadRow.id);
      }

      // Disparar Edge Function (fire and forget)
      const fnName = tipo === "extrato" ? "processar-extrato" : "processar-comprovante";
      fetch(`${FUNCTIONS_URL}/${fnName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: uploadRow.id }),
      }).catch((err) => console.error(`Edge Function ${fnName} error:`, err));
    }

    setUploads(uploadRecords);
  }, [extratoFiles, comprovanteFiles, FUNCTIONS_URL]);

  // Polling: watch upload status
  useEffect(() => {
    if (stage !== "processing" || uploads.length === 0) return;

    const interval = setInterval(async () => {
      const ids = uploads.map((u) => u.id);
      const { data } = await supabase
        .from("uploads")
        .select("*")
        .in("id", ids);

      if (data) {
        setUploads(data as UploadType[]);
        const allDone = data.every((u: UploadType) => u.status === "concluido" || u.status === "erro");
        if (allDone) {
          clearInterval(interval);
          // Trigger conciliacao
          if (extratoUploadId) {
            await fetch(`${FUNCTIONS_URL}/conciliar`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ extrato_upload_id: extratoUploadId }),
            });
            await loadResults();
          }
          setStage("result");
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [stage, uploads, extratoUploadId, FUNCTIONS_URL]);

  const loadResults = useCallback(async () => {
    if (!extratoUploadId) return;

    const [extRes, compRes, concRes] = await Promise.all([
      supabase.from("extratos_itens").select("*").eq("upload_id", extratoUploadId),
      supabase.from("comprovantes").select("*"),
      supabase.from("conciliacoes").select("*"),
    ]);

    if (extRes.data) setExtratoItens(extRes.data as ExtratoItemDB[]);
    if (compRes.data) setComprovantes(compRes.data as ComprovanteDB[]);
    if (concRes.data) setConciliacoes(concRes.data as ConciliacaoDB[]);
  }, [extratoUploadId]);

  // Conciliar manualmente
  const handleConciliarManual = useCallback(async () => {
    if (!selectedExtrato || !selectedComprovante) return;

    await supabase.from("conciliacoes").insert({
      extrato_item_id: selectedExtrato,
      comprovante_id: selectedComprovante,
      confianca: "alta",
      metodo: "manual",
      criterios_match: { manual: true },
    });

    setSelectedExtrato(null);
    setSelectedComprovante(null);
    await loadResults();
  }, [selectedExtrato, selectedComprovante, loadResults]);

  // Confirmar sugestao media
  const handleConfirmar = useCallback(async (conciliacaoId: string) => {
    await supabase.from("conciliacoes").update({ confianca: "alta" }).eq("id", conciliacaoId);
    await loadResults();
  }, [loadResults]);

  // Ignorar item (deletar da lista de pendentes — marca como conciliado sem comprovante)
  const handleIgnorar = useCallback(async (extratoItemId: string) => {
    await supabase.from("conciliacoes").insert({
      extrato_item_id: extratoItemId,
      comprovante_id: null,
      confianca: "alta",
      metodo: "manual",
      criterios_match: { ignorado: true },
    });
    await loadResults();
  }, [loadResults]);

  const handleNovaConciliacao = () => {
    setStage("upload");
    setExtratoFiles([]);
    setComprovanteFiles([]);
    setUploads([]);
    setExtratoItens([]);
    setComprovantes([]);
    setConciliacoes([]);
    setExtratoUploadId(null);
    setSelectedExtrato(null);
    setSelectedComprovante(null);
  };

  // Stats para o resumo
  const stats = useMemo(() => {
    const total = extratoItens.length;
    const conciliadoIds = new Set(conciliacoes.map((c) => c.extrato_item_id));
    const autoConc = conciliacoes.filter((c) => c.confianca === "alta" && c.metodo === "auto").length;
    const aguardando = conciliacoes.filter((c) => c.confianca === "media").length;
    const conciliados = conciliadoIds.size;
    const manuais = total - conciliados;
    const somaExtrato = extratoItens.reduce((s, e) => s + Number(e.valor), 0);
    const somaComp = comprovantes.reduce((s, c) => s + Number(c.valor), 0);
    return { total, autoConc, aguardando, manuais, conciliados, diferenca: somaExtrato + somaComp };
  }, [extratoItens, comprovantes, conciliacoes]);

  // --- UPLOAD STAGE ---
  if (stage === "upload") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileDropzone
            label="Extrato Bancario (CEF)"
            description="PDF exportado do Internet Banking da Caixa"
            files={extratoFiles}
            onFilesChange={setExtratoFiles}
          />
          <FileDropzone
            label="Comprovantes de Pagamento"
            description="PDFs de Pix, Boletos, TEDs, etc."
            multiple
            files={comprovanteFiles}
            onFilesChange={setComprovanteFiles}
          />
        </div>
        <div className="text-center">
          <Button
            onClick={handleProcessar}
            disabled={extratoFiles.length === 0}
            className="gap-2"
            size="lg"
          >
            <Upload className="w-4 h-4" /> Processar e Conciliar
          </Button>
          {extratoFiles.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">Selecione pelo menos o extrato para continuar</p>
          )}
        </div>
      </div>
    );
  }

  // --- PROCESSING STAGE ---
  if (stage === "processing") {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <ProcessingStatus uploads={uploads} />
      </div>
    );
  }

  // --- RESULT STAGE ---
  const conciliadoExtratoIds = new Set(conciliacoes.map((c) => c.extrato_item_id));
  const conciliadoCompIds = new Set(conciliacoes.filter((c) => c.comprovante_id).map((c) => c.comprovante_id));

  const extratoDisplay = extratoItens.map((e) => {
    const conc = conciliacoes.find((c) => c.extrato_item_id === e.id);
    return {
      ...e,
      status: conc ? (conc.metodo as "auto" | "manual") : ("pendente" as const),
      confianca: conc?.confianca || "baixa",
      conciliacaoId: conc?.id,
    };
  });

  const compDisplay = comprovantes.map((c) => {
    const conc = conciliacoes.find((cc) => cc.comprovante_id === c.id);
    return {
      ...c,
      status: conc ? "conciliado" : ("pendente" as const),
    };
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <ConciliacaoResumo stats={stats} />

      {selectedExtrato && selectedComprovante && (
        <Card className="border-accent">
          <CardContent className="pt-3 pb-3 flex items-center justify-between">
            <span className="text-sm">Conciliar itens selecionados manualmente?</span>
            <Button size="sm" onClick={handleConciliarManual} className="gap-1.5">
              <Link2 className="w-4 h-4" /> Conciliar Par
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Extrato Bancario</span>
          </div>
          <div className="divide-y divide-border/50">
            {extratoDisplay.map((item) => {
              const conciliado = item.status !== "pendente";
              return (
                <div
                  key={item.id}
                  onClick={() => !conciliado && setSelectedExtrato(item.id === selectedExtrato ? null : item.id)}
                  className={`px-4 py-3 text-sm cursor-pointer transition-all
                    ${conciliado ? "opacity-50 conciliado-auto" : item.confianca === "media" ? "border-l-4 border-l-warning bg-warning/5" : "nao-conciliado"}
                    ${selectedExtrato === item.id ? "ring-2 ring-primary" : ""}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{item.favorecido || "(sem favorecido)"}</span>
                    <span className={`font-semibold tabular-nums ${Number(item.valor) >= 0 ? "text-success" : "text-destructive"}`}>
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(item.valor))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")} {item.historico && `• ${item.historico}`}
                    </span>
                  </div>
                  {!conciliado && (
                    <div className="flex gap-1.5 mt-2">
                      {item.confianca === "media" && item.conciliacaoId && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 text-success border-success/30"
                          onClick={(e) => { e.stopPropagation(); handleConfirmar(item.conciliacaoId!); }}>
                          Confirmar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-muted-foreground"
                        onClick={(e) => { e.stopPropagation(); handleIgnorar(item.id); }}>
                        Ignorar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold">Comprovantes</span>
          </div>
          <div className="divide-y divide-border/50">
            {compDisplay.map((item) => {
              const conciliado = item.status === "conciliado";
              return (
                <div
                  key={item.id}
                  onClick={() => !conciliado && setSelectedComprovante(item.id === selectedComprovante ? null : item.id)}
                  className={`px-4 py-3 text-sm cursor-pointer transition-all
                    ${conciliado ? "opacity-50 conciliado-auto" : "nao-encontrado-extrato"}
                    ${selectedComprovante === item.id ? "ring-2 ring-primary" : ""}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{item.favorecido || "(sem favorecido)"}</span>
                    <span className="font-semibold tabular-nums text-success">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(item.valor))}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")} {item.tipo_pagamento && `• ${item.tipo_pagamento}`}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleNovaConciliacao}>
          <RotateCcw className="w-4 h-4" /> Nova Conciliacao
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success" /> Confianca Alta (auto)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-warning" /> Confianca Media</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-destructive" /> Conciliacao Manual</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Conciliacao.tsx
git commit -m "feat: refactor Conciliacao page with real upload, OCR processing, and Supabase integration"
```

---

## Task 11: Remover dependencia de ConciliacaoLista do mock

**Files:**
- Modify: `src/components/conciliacao/ConciliacaoLista.tsx`

- [ ] **Step 1: Simplificar ConciliacaoLista**

O componente `ConciliacaoLista.tsx` nao e mais usado pela nova `Conciliacao.tsx` (que renderiza as listas inline). Pode ser mantido como referencia ou removido. Como a nova pagina ja tem a logica de renderizacao inline, remover o import de `ConciliacaoLista` do `Conciliacao.tsx` (ja foi feito no step anterior — o import esta la mas nao e usado).

Remover a importacao nao-utilizada de `ConciliacaoLista` e `ConciliacaoResumo` se nao forem usados. Verificar no codigo da Task 10 — ambos sao importados:
- `ConciliacaoResumo` IS usado (stats card)
- `ConciliacaoLista` NOT usado (listas sao inline agora)

Remover a linha de import de `ConciliacaoLista` de `Conciliacao.tsx`:

```typescript
// REMOVER esta linha:
import ConciliacaoLista from "@/components/conciliacao/ConciliacaoLista";
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Conciliacao.tsx
git commit -m "fix: remove unused ConciliacaoLista import"
```

---

## Task 12: Teste end-to-end e deploy

- [ ] **Step 1: Instalar dependencias do frontend**

Run:
```bash
cd /root/consilia-sl && npm install
```

- [ ] **Step 2: Build do frontend para verificar erros de tipo**

Run:
```bash
cd /root/consilia-sl && npm run build
```

Expected: build sem erros.

- [ ] **Step 3: Verificar Edge Functions acessiveis**

Run:
```bash
curl -X POST http://localhost:8000/functions/v1/processar-extrato \
  -H "Content-Type: application/json" \
  -d '{"upload_id":"test"}' 2>&1 | head -5
```

Expected: resposta JSON (pode ser erro "Upload not found" — normal, o importante e que a funcao responda).

- [ ] **Step 4: Push para GitHub**

```bash
cd /root/consilia-sl
git push origin main
```

- [ ] **Step 5: Configurar variaveis de ambiente**

O usuario precisa configurar no Lovable ou no `.env`:
- `VITE_SUPABASE_URL` — URL externa do Kong (ex: https://supabase.automacaotour.com.br)
- `VITE_SUPABASE_ANON_KEY` — anon key do Supabase self-hosted

---

## Resumo de Tarefas

| # | Tarefa | Dependencia |
|---|--------|-------------|
| 1 | Criar tabelas PostgreSQL | — |
| 2 | Cliente Claude Vision compartilhado | — |
| 3 | Edge Function processar-extrato | 1, 2 |
| 4 | Edge Function processar-comprovante | 1, 2 |
| 5 | Edge Function conciliar | 1 |
| 6 | Cliente Supabase frontend | — |
| 7 | Componente FileDropzone | — |
| 8 | Componente ProcessingStatus | — |
| 9 | Atualizar tipos financeiro | — |
| 10 | Refatorar Conciliacao.tsx | 6, 7, 8, 9 |
| 11 | Remover imports nao usados | 10 |
| 12 | Teste e deploy | tudo |

Tasks 1, 2, 6, 7, 8, 9 podem rodar em paralelo.
Tasks 3, 4, 5 dependem de 1 e 2.
Task 10 depende de 6, 7, 8, 9.
Task 12 depende de tudo.
