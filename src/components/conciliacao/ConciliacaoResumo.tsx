import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/data/mockData";

interface Stats {
  total: number;
  autoConc: number;
  aguardando: number;
  manuais: number;
  conciliados: number;
  diferenca: number;
}

export default function ConciliacaoResumo({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Card>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Extrato</p>
          <p className="text-lg font-bold">{stats.total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Concil. Auto</p>
          <p className="text-lg font-bold text-success">{stats.autoConc}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Aguardando</p>
          <p className="text-lg font-bold text-warning">{stats.aguardando}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Manuais</p>
          <p className="text-lg font-bold text-destructive">{stats.manuais}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Diferença</p>
          <p className={`text-lg font-bold ${stats.diferenca === 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(stats.diferenca)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
