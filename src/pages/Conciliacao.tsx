import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileCheck, AlertTriangle, Link2 } from "lucide-react";
import { formatCurrency } from "@/data/mockData";

interface ExtratoItem {
  id: string;
  data: string;
  historico: string;
  favorecido: string;
  valor: number;
  status: "auto" | "manual" | "pendente";
  parId?: string;
}

interface PlanilhaItem {
  id: string;
  fornecedor: string;
  valor: number;
  data: string;
  status: "auto" | "manual" | "pendente" | "nao-encontrado";
  parId?: string;
}

// Mock data for demo
const extratoMock: ExtratoItem[] = [
  { id: "e1", data: "10/01/2024", historico: "DEB PIX CHAVE", favorecido: "MARCOS NOAL", valor: -18500, status: "auto", parId: "p1" },
  { id: "e2", data: "15/01/2024", historico: "PAG BOLETO IBC", favorecido: "LEROY MERLIN", valor: -3250, status: "auto", parId: "p3" },
  { id: "e3", data: "20/01/2024", historico: "PAG BOLETO IBC", favorecido: "ELETRO CENTER", valor: -4780, status: "pendente" },
  { id: "e4", data: "28/01/2024", historico: "PAG LUZ/GAS IBC", favorecido: "COPEL", valor: -450, status: "auto", parId: "p5" },
  { id: "e5", data: "08/01/2024", historico: "CRED PIX CHAVE", favorecido: "ROBERTO MENIN", valor: 50000, status: "auto", parId: "p2" },
];

const planilhaMock: PlanilhaItem[] = [
  { id: "p1", fornecedor: "Marcos Noal", valor: -18500, data: "10/01/2024", status: "auto", parId: "e1" },
  { id: "p2", fornecedor: "Roberto Menin", valor: 50000, data: "08/01/2024", status: "auto", parId: "e5" },
  { id: "p3", fornecedor: "Leroy Merlin", valor: -3250, data: "15/01/2024", status: "auto", parId: "e2" },
  { id: "p4", fornecedor: "Eletro Center", valor: -4780, data: "20/01/2024", status: "nao-encontrado" },
  { id: "p5", fornecedor: "Copel", valor: -450, data: "28/01/2024", status: "auto", parId: "e4" },
];

export default function Conciliacao() {
  const [uploaded, setUploaded] = useState(false);
  const [extrato, setExtrato] = useState<ExtratoItem[]>([]);
  const [planilha, setPlanilha] = useState<PlanilhaItem[]>([]);
  const [selectedExtrato, setSelectedExtrato] = useState<string | null>(null);
  const [selectedPlanilha, setSelectedPlanilha] = useState<string | null>(null);

  const handleUpload = () => {
    // Simulate PDF parsing
    setExtrato(extratoMock);
    setPlanilha(planilhaMock);
    setUploaded(true);
  };

  const handleConciliarPar = () => {
    if (!selectedExtrato || !selectedPlanilha) return;
    setExtrato(prev => prev.map(e => e.id === selectedExtrato ? { ...e, status: "manual" as const, parId: selectedPlanilha } : e));
    setPlanilha(prev => prev.map(p => p.id === selectedPlanilha ? { ...p, status: "manual" as const, parId: selectedExtrato } : p));
    setSelectedExtrato(null);
    setSelectedPlanilha(null);
  };

  const conciliados = extrato.filter(e => e.status !== "pendente").length;
  const pendentes = extrato.filter(e => e.status === "pendente").length;

  const statusClass = (s: string) => {
    if (s === "auto") return "conciliado-auto";
    if (s === "manual") return "conciliado-manual";
    if (s === "nao-encontrado") return "nao-encontrado-extrato";
    return "nao-conciliado";
  };

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
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-muted-foreground">Total Extrato</p>
          <p className="text-lg font-bold">{extrato.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-muted-foreground">Conciliados</p>
          <p className="text-lg font-bold text-success">{conciliados}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-lg font-bold text-destructive">{pendentes}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-muted-foreground">Diferença</p>
          <p className="text-lg font-bold">{formatCurrency(0)}</p>
        </CardContent></Card>
      </div>

      {/* Manual conciliation */}
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary" /> Extrato Bancário
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {extrato.map(e => (
                <div
                  key={e.id}
                  onClick={() => e.status === "pendente" && setSelectedExtrato(e.id === selectedExtrato ? null : e.id)}
                  className={`px-4 py-3 text-sm cursor-pointer ${statusClass(e.status)} ${selectedExtrato === e.id ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{e.favorecido}</span>
                    <span className={`font-semibold ${e.valor >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(e.valor)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{e.data} • {e.historico}</span>
                    <StatusLabel status={e.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-accent" /> Planilha
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {planilha.map(p => (
                <div
                  key={p.id}
                  onClick={() => (p.status === "nao-encontrado" || p.status === "pendente") && setSelectedPlanilha(p.id === selectedPlanilha ? null : p.id)}
                  className={`px-4 py-3 text-sm cursor-pointer ${statusClass(p.status)} ${selectedPlanilha === p.id ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{p.fornecedor}</span>
                    <span className={`font-semibold ${p.valor >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(p.valor)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{p.data}</span>
                    <StatusLabel status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success" /> Conciliado auto</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-warning" /> Conciliado manual</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-destructive" /> Não encontrado na planilha</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent" /> Não encontrado no extrato</span>
      </div>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, { text: string; cls: string }> = {
    auto: { text: "Auto", cls: "status-ok" },
    manual: { text: "Manual", cls: "status-pending" },
    pendente: { text: "Pendente", cls: "status-missing" },
    "nao-encontrado": { text: "Não encontrado", cls: "status-missing" },
  };
  const s = labels[status] || labels.pendente;
  return <Badge variant="outline" className={`text-[10px] ${s.cls}`}>{s.text}</Badge>;
}
