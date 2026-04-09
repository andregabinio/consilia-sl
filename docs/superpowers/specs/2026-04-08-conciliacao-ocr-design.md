# Conciliacao com OCR via Claude Vision

**Projeto:** Consilia-SL (Casa Sao Lourenco - Feldman Construcoes)
**Data:** 2026-04-08
**Status:** Aprovado pelo usuario

---

## Resumo

Sistema de conciliacao bancaria que permite upload de PDFs (extrato da Caixa Economica Federal + comprovantes de pagamento variados), extrai dados via Claude Vision (Haiku 4.5) e cruza automaticamente as transacoes, mostrando resultado lado a lado com niveis de confianca.

## Contexto

- Projeto existente no Lovable com frontend React + Vite + Tailwind + shadcn/ui
- Atualmente tem logica de conciliacao com dados mock hardcoded, sem backend real
- Volume: 15-30 itens por mes (uma obra so)
- Usuario unico (Andre Gabinio)
- Banco: sempre Caixa Economica Federal
- Comprovantes: mix de Pix, Boleto, TED, Cartao

## Decisoes Tecnicas

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| OCR | Claude Vision (Haiku 4.5) | Melhor custo-beneficio, lida com layouts variados |
| Backend | Supabase Edge Functions | Sem servidor extra, aproveita infra existente |
| Supabase | Self-hosted (VPS existente) | Ja tem instancia rodando |
| Storage | Supabase Storage | Integrado, sem config extra |
| Auth | Nenhum por enquanto | Usuario unico |
| Deploy frontend | Push pro GitHub, sync com Lovable | Workflow mais simples |

## Arquitetura

```
Frontend (React)
    |
    | upload PDFs + fetch resultados
    v
Supabase
    |-- Storage: bucket "documentos"
    |     |-- extratos/
    |     |-- comprovantes/
    |
    |-- Edge Functions:
    |     |-- processar-extrato (PDF -> Claude Vision -> extratos_itens)
    |     |-- processar-comprovante (PDF -> Claude Vision -> comprovantes)
    |     |-- conciliar (match logic -> conciliacoes)
    |
    |-- Tabelas: uploads, extratos_itens, comprovantes, conciliacoes
    |
    v
Claude Vision API (Haiku 4.5)
```

## Modelo de Dados

### Tabela `uploads`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Default gen_random_uuid() |
| tipo | text (check: 'extrato', 'comprovante') | Tipo do arquivo |
| nome_arquivo | text NOT NULL | Nome original do PDF |
| storage_path | text NOT NULL | Caminho no Supabase Storage |
| status | text (check: 'pendente', 'processando', 'concluido', 'erro') | Estado do OCR |
| erro_msg | text | Mensagem de erro se falhar |
| created_at | timestamptz DEFAULT now() | — |

### Tabela `extratos_itens`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Default gen_random_uuid() |
| upload_id | uuid (FK -> uploads) ON DELETE CASCADE | De qual PDF veio |
| data | date NOT NULL | Data da transacao |
| historico | text | Descricao (ex: "DEB PIX CHAVE") |
| favorecido | text | Nome do favorecido |
| cpf_cnpj | text | CPF/CNPJ se disponivel |
| valor | numeric NOT NULL | Valor (negativo = debito) |
| saldo | numeric | Saldo apos transacao |
| nr_doc | text | Numero do documento |

### Tabela `comprovantes`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Default gen_random_uuid() |
| upload_id | uuid (FK -> uploads) ON DELETE CASCADE | De qual PDF veio |
| tipo_pagamento | text | Pix, Boleto, TED, DOC, Cartao |
| data | date NOT NULL | Data do pagamento |
| valor | numeric NOT NULL | Valor pago |
| favorecido | text | Quem recebeu |
| cpf_cnpj | text | CPF/CNPJ do recebedor |
| banco | text | Banco de origem |
| id_transacao | text | Codigo da transacao |
| dados_brutos | jsonb | JSON completo retornado pelo Claude |

### Tabela `conciliacoes`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Default gen_random_uuid() |
| extrato_item_id | uuid (FK -> extratos_itens) UNIQUE | Linha do extrato |
| comprovante_id | uuid (FK -> comprovantes) UNIQUE | Comprovante pareado |
| confianca | text (check: 'alta', 'media', 'baixa') | Nivel de certeza |
| metodo | text (check: 'auto', 'manual') | Como foi conciliado |
| criterios_match | jsonb | Quais criterios bateram |
| created_at | timestamptz DEFAULT now() | — |

### Relacionamentos

```
uploads 1──N extratos_itens
uploads 1──N comprovantes
extratos_itens 1──0..1 conciliacoes
comprovantes   1──0..1 conciliacoes
```

## Edge Functions

### 1. `processar-extrato`

**Trigger:** POST com upload_id
**Fluxo:**
1. Busca PDF no Storage via storage_path do upload
2. Envia para Claude Haiku 4.5 com prompt:
   ```
   Extraia todas as transacoes deste extrato bancario da Caixa Economica Federal.
   Para cada linha retorne um JSON com: data (YYYY-MM-DD), historico, favorecido,
   cpf_cnpj, valor (negativo para debito), saldo, nr_doc.
   Retorne apenas o JSON array, sem texto adicional.
   ```
3. Parseia resposta JSON
4. Insere cada item em `extratos_itens`
5. Atualiza `uploads.status` para 'concluido' ou 'erro'

### 2. `processar-comprovante`

**Trigger:** POST com upload_id
**Fluxo:**
1. Busca PDF no Storage
2. Envia para Claude Haiku 4.5 com prompt:
   ```
   Extraia os dados deste comprovante de pagamento brasileiro.
   Retorne JSON com: tipo_pagamento (Pix/Boleto/TED/DOC/Cartao),
   data (YYYY-MM-DD), valor (numerico positivo), favorecido,
   cpf_cnpj, banco, id_transacao.
   Retorne apenas o JSON, sem texto adicional.
   ```
3. Insere em `comprovantes`
4. Atualiza `uploads.status`

### 3. `conciliar`

**Trigger:** POST com upload_id do extrato
**Pre-condicao:** Frontend faz polling na tabela `uploads` — so habilita o botao "Conciliar" quando todos os uploads (extrato + comprovantes) estiverem com status 'concluido'
**Fluxo:**

**Pass 1 — Confianca Alta (3/3 criterios):**
- Valor identico (tolerancia R$ 0,01)
- Data igual ou diferenca <= 1 dia util
- CPF/CNPJ igual OU nome fuzzy match (Levenshtein <= 2)
- Resultado: conciliacao automatica

**Pass 2 — Confianca Media (2/3 criterios):**
- Valor + data (nome diferente)
- Valor + nome (data ate 5 dias de diferenca)
- Nome + data (valor diferente — possivel parcelamento)
- Resultado: sugestao, aguarda confirmacao manual

**Pass 3 — Confianca Baixa (sem match):**
- Itens do extrato sem par: "nao conciliado"
- Comprovantes sem par: "nao encontrado no extrato"
- Resultado: vinculacao manual pelo usuario

**Casos especiais:**
- Parcelamento: comprovante pode ser fracao do extrato — gera alerta
- Taxas bancarias: debitos sem comprovante — botao "Ignorar"
- Aportes: creditos — match com transferencia recebida

## Frontend

### Componentes modificados

**`Conciliacao.tsx` (reformulado):**
- 3 estados: Upload -> Processando -> Resultado
- Estado Upload: dois dropzones (extrato + comprovantes) com drag & drop
- Estado Processando: barra de progresso com status por arquivo
- Estado Resultado: layout lado a lado existente, alimentado por dados reais do Supabase

**`ConciliacaoLista.tsx` (ajustado):**
- Mantem estrutura atual
- Adiciona link para visualizar PDF original
- Dados vem do Supabase em vez de mock

**`ConciliacaoResumo.tsx`:**
- Sem mudanca estrutural, apenas alimentado por dados reais

**`conciliacao.ts` (removido/simplificado):**
- Logica de match migra para Edge Function `conciliar`
- Arquivo pode ser mantido apenas com tipos/interfaces

### Novos componentes

**`FileDropzone.tsx`:**
- Componente de drag & drop para upload de PDF
- Preview com nome do arquivo e tamanho
- Suporta multiplos arquivos (para comprovantes)
- Barra de progresso individual

### Interacoes do usuario no resultado

- **Confirmar**: aceita sugestao de match medio → POST atualiza conciliacao para metodo 'manual', confianca 'alta'
- **Ignorar**: marca item do extrato como irrelevante → remove da lista pendente
- **Vincular manualmente**: seleciona 1 extrato + 1 comprovante → cria conciliacao com metodo 'manual'
- **Nova Conciliacao**: limpa estado e volta pro upload

## Custo Estimado

Com Haiku 4.5 e 30 imagens/mes:
- ~R$ 0,50/mes

## Fora do Escopo (v1)

- Autenticacao / multi-usuario
- Exportacao de relatorio da conciliacao
- Historico de conciliacoes anteriores (pode ser adicionado depois via query nas tabelas)
- Suporte a outros bancos alem da Caixa
- Upload de imagens (apenas PDF)
