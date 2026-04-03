import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lancamentosMock, calcularResumosMensais, formatCurrency, formatMes, formatDate, MESES_PT } from "@/data/mockData";
import { Mail, FileDown, FileText } from "lucide-react";

export default function Relatorio() {
  const meses = useMemo(() => [...new Set(lancamentosMock.map(l => l.mes))].sort(), []);
  const resumos = useMemo(() => calcularResumosMensais(lancamentosMock), []);
  const [selectedMes, setSelectedMes] = useState(meses[meses.length - 1] || "");
  const [showEmail, setShowEmail] = useState(false);

  const lancMes = lancamentosMock.filter(l => l.mes === selectedMes);
  const resumoAtual = resumos.find(r => r.mes === selectedMes);
  const saldoAtual = resumos.length > 0 ? resumos[resumos.length - 1].posicaoCaixa : 0;
  const [ano, mesNum] = selectedMes.split("-");
  const mesExtenso = MESES_PT[mesNum] || "";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedMes} onValueChange={setSelectedMes}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {meses.map(m => <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5"><FileDown className="w-4 h-4" /> Exportar PDF</Button>
        <Button variant="outline" size="sm" className="gap-1.5"><FileText className="w-4 h-4" /> Exportar XLSX</Button>
        <Button size="sm" className="gap-1.5" onClick={() => setShowEmail(!showEmail)}>
          <Mail className="w-4 h-4" /> Enviar para Contabilidade
        </Button>
      </div>

      {/* Email preview */}
      {showEmail && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Prévia do E-mail</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
              <span className="text-muted-foreground font-medium">Para:</span>
              <span>marcos.feldmanincorporadora@hotmail.com</span>
              <span className="text-muted-foreground font-medium">De:</span>
              <span>gabinio.andre@gmail.com</span>
              <span className="text-muted-foreground font-medium">Assunto:</span>
              <span className="font-medium">Contabilidade da Obra SL - {mesExtenso}/{ano}</span>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap font-mono text-xs leading-relaxed">
{`Boa tarde,

Segue a planilha de controle financeiro referente ao mês de ${mesExtenso} de ${ano} juntamente com os comprovantes de pagamento, NF e outros documentos contábeis.

Legenda dos arquivos em anexo:

CP: Comprovante de Pagamento
CT: Comprovante de Transferência
OR: Orçamento
NF: Nota Fiscal

André Gabinio
Arquiteto e Urbanista
CAU A116190-3
+55 41 996975087`}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Anexos gerados automaticamente:</p>
              <div className="space-y-1">
                <Badge variant="secondary" className="text-xs">📊 Planilha_{mesExtenso}_{ano}.xlsx</Badge>
                <Badge variant="secondary" className="text-xs ml-2">📄 Resumo_{mesExtenso}_{ano}.pdf</Badge>
                <Badge variant="secondary" className="text-xs ml-2">📁 Documentos_{mesExtenso}_{ano}.zip</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm">Enviar E-mail</Button>
              <Button variant="outline" size="sm" onClick={() => setShowEmail(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Preview — Client-facing monthly summary */}
      <Card className="overflow-hidden">
        <div className="bg-primary px-8 py-6">
          <h2 className="text-primary-foreground text-xl font-bold tracking-wide">PLANILHA CASA SÃO LOURENÇO</h2>
          <p className="text-primary-foreground/70 text-sm mt-1">Atualização: {new Date().toLocaleDateString("pt-BR")}</p>
        </div>

        <CardContent className="p-8 space-y-8">
          {/* Saldo Disponível */}
          <div className="text-center py-6 border border-border rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground uppercase tracking-editorial mb-1">Saldo Disponível Atual</p>
            <p className="text-3xl font-bold text-primary tracking-tight">{formatCurrency(saldoAtual)}</p>
          </div>

          {/* Resumo dos meses anteriores */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-editorial text-muted-foreground mb-4">Resumo por Mês</h3>
            <div className="space-y-2">
              {resumos.map(r => {
                const [rAno, rMes] = r.mes.split("-");
                const rMesNome = MESES_PT[rMes];
                const isSelected = r.mes === selectedMes;
                return (
                  <div key={r.mes} className={`rounded-lg p-4 ${isSelected ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">{rMesNome}/{rAno}</span>
                      {isSelected && <Badge variant="secondary" className="text-[10px]">Mês corrente</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Total Encaixe e Desencaixe</span>
                        <p className={`font-semibold tabular-nums ${r.saldoMes >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(r.saldoMes)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Posição do Caixa</span>
                        <p className="font-semibold tabular-nums">{formatCurrency(r.posicaoCaixa)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabela detalhada do mês corrente */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-editorial text-muted-foreground mb-4">
              Detalhamento — {mesExtenso}/{ano}
            </h3>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Data Pedido</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Fornecedor</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Encaixes</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Desencaixes</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Dt. Pgto</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Pagamento</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Modalidade</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {lancMes.map(l => (
                    <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-2 text-xs">{formatDate(l.dataPedido)}</td>
                      <td className="px-4 py-2 text-xs font-medium">{l.fornecedor}</td>
                      <td className="px-4 py-2 text-xs text-right text-success font-medium tabular-nums">
                        {l.encaixes > 0 ? formatCurrency(l.encaixes) : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-right text-destructive font-medium tabular-nums">
                        {l.desencaixes < 0 ? formatCurrency(l.desencaixes) : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(l.dataPagamento)}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{l.pagamento}</td>
                      <td className="px-4 py-2 text-xs">
                        <Badge variant="secondary" className="text-[10px]">{l.modalidade}</Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{l.observacoes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
                {resumoAtual && (
                  <tfoot>
                    <tr className="bg-muted/40 font-semibold border-t border-border">
                      <td className="px-4 py-2.5 text-xs" colSpan={2}>Total Encaixe e Desencaixe</td>
                      <td className="px-4 py-2.5 text-xs text-right text-success tabular-nums">{formatCurrency(resumoAtual.encaixes)}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-destructive tabular-nums">{formatCurrency(resumoAtual.desencaixes)}</td>
                      <td colSpan={4}></td>
                    </tr>
                    <tr className="bg-primary/5 font-bold">
                      <td className="px-4 py-2.5 text-xs" colSpan={2}>Posição do Caixa</td>
                      <td className="px-4 py-2.5 text-xs text-right tabular-nums" colSpan={2}>{formatCurrency(resumoAtual.posicaoCaixa)}</td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
