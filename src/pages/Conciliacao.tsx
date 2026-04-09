import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileCheck, Link2, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Upload as UploadType, ExtratoItemDB, ComprovanteDB, ConciliacaoDB } from "@/types/financeiro";
import { formatCurrency } from "@/data/mockData";
import FileDropzone from "@/components/conciliacao/FileDropzone";
import ProcessingStatus from "@/components/conciliacao/ProcessingStatus";
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

  // Helper: convert File to base64
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // remove "data:...;base64," prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Create upload records + send PDF base64 to Edge Functions
  const handleProcessar = useCallback(async () => {
    if (extratoFiles.length === 0) return;
    setStage("processing");

    const allFiles = [
      ...extratoFiles.map((f) => ({ file: f, tipo: "extrato" as const })),
      ...comprovanteFiles.map((f) => ({ file: f, tipo: "comprovante" as const })),
    ];

    const uploadRecords: UploadType[] = [];

    for (const { file, tipo } of allFiles) {
      // Create upload record in DB
      const { data: uploadRow, error: dbErr } = await supabase
        .from("uploads")
        .insert({ tipo, nome_arquivo: file.name, storage_path: `direct/${file.name}`, status: "pendente" })
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

      // Convert file to base64 and send directly to Edge Function
      const pdf_base64 = await fileToBase64(file);
      const fnName = tipo === "extrato" ? "processar-extrato" : "processar-comprovante";
      fetch(`${FUNCTIONS_URL}/${fnName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: uploadRow.id, pdf_base64 }),
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

  const handleConfirmar = useCallback(async (conciliacaoId: string) => {
    await supabase.from("conciliacoes").update({ confianca: "alta" }).eq("id", conciliacaoId);
    await loadResults();
  }, [loadResults]);

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
      status: conc ? ("conciliado" as const) : ("pendente" as const),
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
                      {formatCurrency(Number(item.valor))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")} {item.historico && `\u2022 ${item.historico}`}
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
                      {formatCurrency(Number(item.valor))}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")} {item.tipo_pagamento && `\u2022 ${item.tipo_pagamento}`}
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
