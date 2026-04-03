import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { lancamentosMock, formatCurrency, formatDate, formatMes, MESES_PT } from "@/data/mockData";
import { Lancamento, StatusDoc, Pagador, Modalidade } from "@/types/financeiro";
import { Plus, Search, Filter } from "lucide-react";

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(lancamentosMock);
  const [filtroMes, setFiltroMes] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroPagador, setFiltroPagador] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const mesesDisponiveis = useMemo(() => {
    const meses = [...new Set(lancamentos.map(l => l.mes))].sort();
    return meses;
  }, [lancamentos]);

  const filtered = useMemo(() => {
    return lancamentos.filter(l => {
      if (filtroMes !== "todos" && l.mes !== filtroMes) return false;
      if (filtroTipo === "encaixe" && l.encaixes === 0) return false;
      if (filtroTipo === "desencaixe" && l.desencaixes === 0) return false;
      if (filtroPagador !== "todos" && l.pagamento !== filtroPagador) return false;
      if (busca && !l.fornecedor.toLowerCase().includes(busca.toLowerCase()) && !l.descricao.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [lancamentos, filtroMes, filtroTipo, filtroPagador, busca]);

  const grouped = useMemo(() => {
    const map = new Map<string, Lancamento[]>();
    filtered.forEach(l => {
      const arr = map.get(l.mes) || [];
      arr.push(l);
      map.set(l.mes, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function getRowStatus(l: Lancamento) {
    if (l.confirmado === "OK" && l.comprovante === "OK" && l.notaFiscal === "OK") return "ok";
    if (l.comprovante === "-" && l.notaFiscal === "-" && l.orcamento === "-") return "missing";
    return "partial";
  }

  const statusColors = { ok: "border-l-success", partial: "border-l-warning", missing: "border-l-destructive" };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar fornecedor..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {mesesDisponiveis.map(m => <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="encaixe">Encaixes</SelectItem>
                <SelectItem value="desencaixe">Desencaixes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroPagador} onValueChange={setFiltroPagador}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Pagador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Roberto Menin">Roberto Menin</SelectItem>
                <SelectItem value="Feldman">Feldman</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Novo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
                <LancamentoForm onSave={(l) => { setLancamentos(prev => [...prev, l]); setDialogOpen(false); }} />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Table groups by month */}
      {grouped.map(([mes, items]) => {
        const enc = items.reduce((s, l) => s + l.encaixes, 0);
        const des = items.reduce((s, l) => s + l.desencaixes, 0);
        return (
          <Card key={mes}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{formatMes(mes)}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Data Pedido</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fornecedor</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Encaixes</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Desencaixes</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Pgto</th>
                      <th className="text-center px-2 py-2.5 font-medium text-muted-foreground">OR</th>
                      <th className="text-center px-2 py-2.5 font-medium text-muted-foreground">CP</th>
                      <th className="text-center px-2 py-2.5 font-medium text-muted-foreground">NF</th>
                      <th className="text-center px-2 py-2.5 font-medium text-muted-foreground">Conf</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Modalidade</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Pagador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(l => (
                      <tr key={l.id} className={`border-b border-border/50 hover:bg-muted/30 border-l-4 ${statusColors[getRowStatus(l)]}`}>
                        <td className="px-4 py-2">{formatDate(l.dataPedido)}</td>
                        <td className="px-4 py-2">
                          <div className="font-medium text-foreground">{l.fornecedor}</div>
                          <div className="text-xs text-muted-foreground">{l.descricao}</div>
                        </td>
                        <td className="px-4 py-2 text-right text-success font-medium">{l.encaixes > 0 ? formatCurrency(l.encaixes) : "-"}</td>
                        <td className="px-4 py-2 text-right text-destructive font-medium">{l.desencaixes < 0 ? formatCurrency(l.desencaixes) : "-"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{formatDate(l.dataPagamento)}</td>
                        <td className="px-2 py-2 text-center"><StatusBadge value={l.orcamento} /></td>
                        <td className="px-2 py-2 text-center"><StatusBadge value={l.comprovante} /></td>
                        <td className="px-2 py-2 text-center"><StatusBadge value={l.notaFiscal} /></td>
                        <td className="px-2 py-2 text-center"><StatusBadge value={l.confirmado} /></td>
                        <td className="px-4 py-2"><Badge variant="secondary" className="text-xs">{l.modalidade}</Badge></td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">{l.pagamento}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 font-semibold">
                      <td className="px-4 py-2" colSpan={2}>Total Encaixes e Desencaixes</td>
                      <td className="px-4 py-2 text-right text-success">{formatCurrency(enc)}</td>
                      <td className="px-4 py-2 text-right text-destructive">{formatCurrency(des)}</td>
                      <td colSpan={7}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StatusBadge({ value }: { value: StatusDoc }) {
  return value === "OK"
    ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/15 text-success text-[10px] font-bold">✓</span>
    : <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-[10px]">—</span>;
}

function LancamentoForm({ onSave }: { onSave: (l: Lancamento) => void }) {
  const [form, setForm] = useState({
    dataPedido: "", fornecedor: "", descricao: "", encaixes: "", desencaixes: "",
    dataPagamento: "", pagamento: "Feldman" as Pagador, modalidade: "Pix" as Modalidade, observacoes: "",
  });

  const handleSubmit = () => {
    const now = new Date(form.dataPedido || Date.now());
    const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    onSave({
      id: crypto.randomUUID(),
      dataPedido: form.dataPedido,
      fornecedor: form.fornecedor,
      descricao: form.descricao,
      encaixes: Number(form.encaixes) || 0,
      desencaixes: form.desencaixes ? -Math.abs(Number(form.desencaixes)) : 0,
      dataPagamento: form.dataPagamento || form.dataPedido,
      orcamento: "-", comprovante: "-", notaFiscal: "-", confirmado: "-",
      pagamento: form.pagamento, modalidade: form.modalidade,
      observacoes: form.observacoes, mes,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Data do Pedido</Label><Input type="date" value={form.dataPedido} onChange={e => setForm(p => ({ ...p, dataPedido: e.target.value }))} /></div>
        <div><Label className="text-xs">Data Pagamento</Label><Input type="date" value={form.dataPagamento} onChange={e => setForm(p => ({ ...p, dataPagamento: e.target.value }))} /></div>
      </div>
      <div><Label className="text-xs">Fornecedor</Label><Input value={form.fornecedor} onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))} /></div>
      <div><Label className="text-xs">Descrição</Label><Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Encaixes (R$)</Label><Input type="number" value={form.encaixes} onChange={e => setForm(p => ({ ...p, encaixes: e.target.value }))} placeholder="0,00" /></div>
        <div><Label className="text-xs">Desencaixes (R$)</Label><Input type="number" value={form.desencaixes} onChange={e => setForm(p => ({ ...p, desencaixes: e.target.value }))} placeholder="0,00" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Pagador</Label>
          <Select value={form.pagamento} onValueChange={(v) => setForm(p => ({ ...p, pagamento: v as Pagador }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Roberto Menin">Roberto Menin</SelectItem>
              <SelectItem value="Feldman">Feldman</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Modalidade</Label>
          <Select value={form.modalidade} onValueChange={(v) => setForm(p => ({ ...p, modalidade: v as Modalidade }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pix">Pix</SelectItem>
              <SelectItem value="Boleto">Boleto</SelectItem>
              <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs">Observações</Label><Input value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
      <Button onClick={handleSubmit} className="w-full">Salvar Lançamento</Button>
    </div>
  );
}
