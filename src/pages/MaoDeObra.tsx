import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { maoDeObraMock, administracaoMock, formatCurrency } from "@/data/mockData";

export default function MaoDeObra() {
  const mo = maoDeObraMock;
  const adm = administracaoMock;
  const moPct = (mo.realizado / mo.contratado) * 100;
  const admPct = (adm.realizadoTotal / adm.contratado) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Mão de Obra */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mão de Obra — Marcos Noal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatBox label="Contratado" value={formatCurrency(mo.contratado)} />
            <StatBox label="Realizado" value={formatCurrency(mo.realizado)} variant="warning" />
            <StatBox label="Saldo" value={formatCurrency(mo.saldo)} variant="success" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso</span>
              <span>{moPct.toFixed(1)}%</span>
            </div>
            <Progress value={moPct} className="h-2" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Mês</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Responsável</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Obs</th>
                </tr>
              </thead>
              <tbody>
                {mo.pagamentos.map((p, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-2">{p.mes}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(p.valor)}</td>
                    <td className="px-4 py-2"><Badge variant="secondary" className="text-xs">{p.responsavel}</Badge></td>
                    <td className="px-4 py-2 text-muted-foreground">{p.obs || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Administração */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Administração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatBox label="Contratado" value={formatCurrency(adm.contratado)} />
            <StatBox label="André" value={formatCurrency(adm.realizadoAndre)} variant="info" />
            <StatBox label="Marcos" value={formatCurrency(adm.realizadoMarcos)} variant="info" />
            <StatBox label="Total Realizado" value={formatCurrency(adm.realizadoTotal)} variant="warning" />
            <StatBox label="Saldo" value={formatCurrency(adm.saldo)} variant="success" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso</span>
              <span>{admPct.toFixed(1)}%</span>
            </div>
            <Progress value={admPct} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value, variant = "default" }: { label: string; value: string; variant?: string }) {
  const colors: Record<string, string> = {
    default: "bg-muted/50",
    success: "bg-success/10",
    warning: "bg-warning/10",
    info: "bg-info/10",
  };
  return (
    <div className={`p-3 rounded-lg ${colors[variant] || colors.default}`}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
