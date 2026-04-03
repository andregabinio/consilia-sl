import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileCheck, Link2, XCircle, Plus, AlertTriangle } from "lucide-react";
import { formatCurrency, lancamentosMock, formatDate } from "@/data/mockData";
import { Lancamento } from "@/types/financeiro";
import ConciliacaoLista from "@/components/conciliacao/ConciliacaoLista";
import ConciliacaoResumo from "@/components/conciliacao/ConciliacaoResumo";
import { matchExtrato, ExtratoItem, PlanilhaItem, ConfidenceLevel } from "@/lib/conciliacao";

export default function Conciliacao() {
  const [uploaded, setUploaded] = useState(false);
  const [extrato, setExtrato] = useState<ExtratoItem[]>([]);
  const [planilha, setPlanilha] = useState<PlanilhaItem[]>([]);
  const [selectedExtrato, setSelectedExtrato] = useState<string | null>(null);
  const [selectedPlanilha, setSelectedPlanilha] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleUpload = () => {
    // Simulate PDF parsing — in production, parse with pdf.js
    const { extrato: ext, planilha: plan } = matchExtrato(lancamentosMock);
    setExtrato(ext);
    setPlanilha(plan);
    setUploaded(true);
  };

  const handleConciliarPar = useCallback(() => {
    if (!selectedExtrato || !selectedPlanilha) return;
    setExtrato(prev => prev.map(e =>
      e.id === selectedExtrato ? { ...e, status: "manual", confianca: "alta", parId: selectedPlanilha } : e
    ));
    setPlanilha(prev => prev.map(p =>
      p.id === selectedPlanilha ? { ...p, status: "manual", parId: selectedExtrato } : p
    ));
    setSelectedExtrato(null);
    setSelectedPlanilha(null);
  }, [selectedExtrato, selectedPlanilha]);

  const handleIgnorar = useCallback((id: string) => {
    setExtrato(prev => prev.map(e =>
      e.id === id ? { ...e, status: "ignorado" as any, confianca: "alta" as ConfidenceLevel } : e
    ));
  }, []);

  const handleConfirmar = useCallback((extratoId: string, planilhaId: string) => {
    setExtrato(prev => prev.map(e =>
      e.id === extratoId ? { ...e, status: "auto", confianca: "alta", parId: planilhaId } : e
    ));
    setPlanilha(prev => prev.map(p =>
      p.id === planilhaId ? { ...p, status: "auto", parId: extratoId } : p
    ));
  }, []);

  const stats = useMemo(() => {
    const total = extrato.length;
    const autoConc = extrato.filter(e => e.status === "auto").length;
    const aguardando = extrato.filter(e => e.confianca === "media" && e.status === "pendente").length;
    const manuais = extrato.filter(e => (e.confianca === "baixa" || e.confianca === "manual") && e.status === "pendente").length;
    const ignorados = extrato.filter(e => (e as any).status === "ignorado").length;
    const conciliados = autoConc + extrato.filter(e => e.status === "manual").length + ignorados;
    const somaExtrato = extrato.reduce((s, e) => s + e.valor, 0);
    const somaPlanilha = planilha.reduce((s, p) => s + p.valor, 0);
    return { total, autoConc, aguardando, manuais, conciliados, diferenca: somaExtrato - somaPlanilha };
  }, [extrato, planilha]);

  if (!uploaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Upload do Extrato Bancário</h3>
            <p className="text-sm text-muted-foreground">Faça upload do PDF exportado da Caixa Econômica Federal para iniciar a conciliação.</p>
            <Button onClick={handleUpload} className="gap-2">
              <Upload className="w-4 h-4" /> Selecionar PDF do Extrato
            </Button>
            <p className="text-[11px] text-muted-foreground">Formato: PDF exportado do Internet Banking da Caixa</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <ConciliacaoResumo stats={stats} />

      {/* Manual conciliation bar */}
      {selectedExtrato && selectedPlanilha && (
        <Card className="border-accent">
          <CardContent className="pt-3 pb-3 flex items-center justify-between">
            <span className="text-sm">Conciliar itens selecionados manualmente?</span>
            <Button size="sm" onClick={handleConciliarPar} className="gap-1.5">
              <Link2 className="w-4 h-4" /> Conciliar Par
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConciliacaoLista
          title="Extrato Bancário"
          icon={<FileCheck className="w-4 h-4 text-primary" />}
          items={extrato}
          selectedId={selectedExtrato}
          onSelect={(id) => {
            const item = extrato.find(e => e.id === id);
            if (item && item.status === "pendente") setSelectedExtrato(id === selectedExtrato ? null : id);
          }}
          onIgnorar={handleIgnorar}
          onConfirmar={(extratoId) => {
            const item = extrato.find(e => e.id === extratoId);
            if (item?.sugestaoParId) handleConfirmar(extratoId, item.sugestaoParId);
          }}
          side="extrato"
        />
        <ConciliacaoLista
          title="Planilha"
          icon={<FileCheck className="w-4 h-4 text-accent" />}
          items={planilha}
          selectedId={selectedPlanilha}
          onSelect={(id) => {
            const item = planilha.find(p => p.id === id);
            if (item && (item.status === "nao-encontrado" || item.status === "pendente")) {
              setSelectedPlanilha(id === selectedPlanilha ? null : id);
            }
          }}
          side="planilha"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4" /> Criar Lançamento
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success" /> Confiança Alta (auto)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-warning" /> Confiança Média</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-destructive" /> Conciliação Manual</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent" /> Não encontrado no extrato</span>
      </div>
    </div>
  );
}
