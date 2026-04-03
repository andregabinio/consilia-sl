import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XCircle, Check, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/data/mockData";
import { ExtratoItem, PlanilhaItem, ConfidenceLevel } from "@/lib/conciliacao";

interface Props {
  title: string;
  icon: React.ReactNode;
  items: (ExtratoItem | PlanilhaItem)[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onIgnorar?: (id: string) => void;
  onConfirmar?: (id: string) => void;
  side: "extrato" | "planilha";
}

function isExtrato(item: ExtratoItem | PlanilhaItem): item is ExtratoItem {
  return "favorecido" in item;
}

function statusClass(item: ExtratoItem | PlanilhaItem) {
  const s = item.status;
  if (s === "auto") return "conciliado-auto";
  if (s === "manual") return "conciliado-manual";
  if (s === "nao-encontrado") return "nao-encontrado-extrato";
  if (isExtrato(item) && item.confianca === "media") return "border-l-4 border-l-warning bg-warning/5";
  return "nao-conciliado";
}

function ConfidenceBadge({ confianca }: { confianca: ConfidenceLevel }) {
  const map = {
    alta: { emoji: "🟢", label: "Alta", cls: "status-ok" },
    media: { emoji: "🟡", label: "Média", cls: "status-pending" },
    baixa: { emoji: "🔴", label: "Manual", cls: "status-missing" },
    manual: { emoji: "🔴", label: "Manual", cls: "status-missing" },
  };
  const m = map[confianca];
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.emoji} {m.label}</Badge>;
}

export default function ConciliacaoLista({ title, icon, items, selectedId, onSelect, onIgnorar, onConfirmar, side }: Props) {
  const isConciliado = (item: ExtratoItem | PlanilhaItem) =>
    item.status === "auto" || item.status === "manual" || (item as any).status === "ignorado";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {items.map(item => {
            const conciliado = isConciliado(item);
            return (
              <div
                key={item.id}
                onClick={() => !conciliado && onSelect(item.id)}
                className={`px-4 py-3 text-sm cursor-pointer transition-all
                  ${statusClass(item)}
                  ${selectedId === item.id ? "ring-2 ring-primary" : ""}
                  ${conciliado ? "opacity-50" : ""}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium">
                    {isExtrato(item) ? item.favorecido || "(sem favorecido)" : (item as PlanilhaItem).fornecedor}
                  </span>
                  <span className={`font-semibold tabular-nums ${item.valor >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(item.valor)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {isExtrato(item) ? `${new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")} • ${item.historico}` : new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")}
                  </span>
                  <div className="flex items-center gap-1">
                    {isExtrato(item) && <ConfidenceBadge confianca={item.confianca} />}
                    {!isExtrato(item) && item.status === "nao-encontrado" && (
                      <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent">Não no extrato</Badge>
                    )}
                  </div>
                </div>

                {/* Alerts */}
                {isExtrato(item) && item.alertas && item.alertas.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {item.alertas.map((a, i) => (
                      <div key={i} className="flex items-center gap-1 text-[11px] text-warning">
                        <AlertTriangle className="w-3 h-3" /> {a}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons for extrato items */}
                {side === "extrato" && !conciliado && (
                  <div className="flex gap-1.5 mt-2">
                    {isExtrato(item) && item.confianca === "media" && item.sugestaoParId && onConfirmar && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 text-success border-success/30" onClick={(e) => { e.stopPropagation(); onConfirmar(item.id); }}>
                        <Check className="w-3 h-3" /> Confirmar
                      </Button>
                    )}
                    {onIgnorar && (
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onIgnorar(item.id); }}>
                        <XCircle className="w-3 h-3" /> Ignorar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
