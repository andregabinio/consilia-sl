import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lancamentosMock, calcularResumosMensais, formatCurrency, formatMes } from "@/data/mockData";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function FluxoCaixa() {
  const resumos = useMemo(() => calcularResumosMensais(lancamentosMock), []);

  const chartData = resumos.map(r => ({
    mes: formatMes(r.mes).split("/")[0].substring(0, 3),
    Encaixes: r.encaixes,
    Desencaixes: Math.abs(r.desencaixes),
    "Posição Caixa": r.posicaoCaixa,
  }));

  // Breakdown by modalidade
  const modalidades = useMemo(() => {
    const map: Record<string, number> = { Pix: 0, Boleto: 0, "Cartão de Crédito": 0 };
    lancamentosMock.forEach(l => {
      if (l.desencaixes < 0) map[l.modalidade] = (map[l.modalidade] || 0) + Math.abs(l.desencaixes);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([nome, valor]) => ({
      nome, valor, pct: total > 0 ? ((valor / total) * 100).toFixed(1) : "0",
    }));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Resumo Mensal</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Mês</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Encaixes</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Desencaixes</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Saldo do Mês</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Posição do Caixa</th>
                </tr>
              </thead>
              <tbody>
                {resumos.map(r => (
                  <tr key={r.mes} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{formatMes(r.mes)}</td>
                    <td className="px-4 py-2.5 text-right text-success font-medium">{formatCurrency(r.encaixes)}</td>
                    <td className="px-4 py-2.5 text-right text-destructive font-medium">{formatCurrency(r.desencaixes)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${r.saldoMes >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(r.saldoMes)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold">{formatCurrency(r.posicaoCaixa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Encaixes vs Desencaixes</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="Encaixes" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Desencaixes" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Posição do Caixa</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="Posição Caixa" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modalidade breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-base">Desencaixes por Modalidade</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {modalidades.map(m => (
              <div key={m.nome} className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{m.nome}</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(m.valor)}</p>
                <Badge variant="secondary" className="mt-1 text-xs">{m.pct}%</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
