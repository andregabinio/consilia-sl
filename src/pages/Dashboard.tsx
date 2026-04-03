import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lancamentosMock, calcularResumosMensais, formatCurrency, formatMes } from "@/data/mockData";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Dashboard() {
  const resumos = useMemo(() => calcularResumosMensais(lancamentosMock), []);
  const totalEncaixes = lancamentosMock.reduce((s, l) => s + l.encaixes, 0);
  const totalDesencaixes = lancamentosMock.reduce((s, l) => s + l.desencaixes, 0);
  const saldoAtual = resumos.length > 0 ? resumos[resumos.length - 1].posicaoCaixa : 0;
  const naoConciliados = lancamentosMock.filter(l => l.confirmado === "-");
  const docsPendentes = lancamentosMock.filter(l => l.comprovante === "-" || l.notaFiscal === "-");

  const chartData = resumos.slice(-6).map(r => ({
    mes: formatMes(r.mes).split("/")[0].substring(0, 3),
    Encaixes: r.encaixes,
    Desencaixes: Math.abs(r.desencaixes),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Saldo Disponível"
          value={formatCurrency(saldoAtual)}
          icon={<DollarSign className="w-5 h-5" />}
          variant="primary"
        />
        <KpiCard
          title="Total Encaixes"
          value={formatCurrency(totalEncaixes)}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="success"
        />
        <KpiCard
          title="Total Desencaixes"
          value={formatCurrency(Math.abs(totalDesencaixes))}
          icon={<TrendingDown className="w-5 h-5" />}
          variant="destructive"
        />
        <KpiCard
          title="Última Atualização"
          value="—"
          icon={<Clock className="w-5 h-5" />}
          variant="muted"
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Encaixes vs Desencaixes — Últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 13 }}
                />
                <Legend />
                <Bar dataKey="Encaixes" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Desencaixes" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Não Conciliados ({naoConciliados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {naoConciliados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos conciliados ✓</p>
            ) : (
              naoConciliados.map(l => (
                <div key={l.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-foreground">{l.fornecedor}</span>
                  <Badge variant="outline" className="status-pending text-xs">{formatCurrency(l.desencaixes || l.encaixes)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Documentos Pendentes ({docsPendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {docsPendentes.map(l => (
              <div key={l.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border/50 last:border-0">
                <span className="text-foreground">{l.fornecedor}</span>
                <div className="flex gap-1">
                  {l.comprovante === "-" && <Badge variant="outline" className="status-missing text-[10px]">CP</Badge>}
                  {l.notaFiscal === "-" && <Badge variant="outline" className="status-missing text-[10px]">NF</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, variant }: {
  title: string; value: string; icon: React.ReactNode;
  variant: "primary" | "success" | "destructive" | "muted";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
          <div className={`p-2 rounded-lg ${colors[variant]}`}>{icon}</div>
        </div>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
