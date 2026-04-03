import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lancamentosMock, calcularResumosMensais, formatCurrency, formatMes, maoDeObraMock, administracaoMock, MESES_PT } from "@/data/mockData";
import { Mail, FileDown, FileText } from "lucide-react";

export default function Relatorio() {
  const meses = useMemo(() => [...new Set(lancamentosMock.map(l => l.mes))].sort(), []);
  const [selectedMes, setSelectedMes] = useState(meses[meses.length - 1] || "");
  const [showEmail, setShowEmail] = useState(false);

  const lancMes = lancamentosMock.filter(l => l.mes === selectedMes);
  const resumo = calcularResumosMensais(lancamentosMock).find(r => r.mes === selectedMes);
  const [ano, mesNum] = selectedMes.split("-");
  const mesExtenso = MESES_PT[mesNum] || "";

  // Modalidade breakdown
  const modalidades = useMemo(() => {
    const map: Record<string, number> = {};
    lancMes.forEach(l => { if (l.desencaixes < 0) map[l.modalidade] = (map[l.modalidade] || 0) + Math.abs(l.desencaixes); });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([nome, valor]) => ({ nome, valor, pct: total > 0 ? ((valor / total) * 100).toFixed(1) : "0" }));
  }, [lancMes]);

  // Doc stats
  const docStats = useMemo(() => {
    const nfOk = lancMes.filter(l => l.notaFiscal === "OK").length;
    const cpOk = lancMes.filter(l => l.comprovante === "OK").length;
    const orOk = lancMes.filter(l => l.orcamento === "OK").length;
    return { nfOk, nfPend: lancMes.length - nfOk, cpOk, cpPend: lancMes.length - cpOk, orOk, orPend: lancMes.length - orOk };
  }, [lancMes]);

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
                <Badge variant="secondary" className="text-xs ml-2">📄 Relatorio_{mesExtenso}_{ano}.pdf</Badge>
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

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relatório Gerencial — {mesExtenso}/{ano}</CardTitle>
          <p className="text-xs text-muted-foreground">Planilha Casa São Lourenço • Emissão: {new Date().toLocaleDateString("pt-BR")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Totals */}
          {resumo && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatBox label="Encaixes" value={formatCurrency(resumo.encaixes)} />
              <StatBox label="Desencaixes" value={formatCurrency(resumo.desencaixes)} />
              <StatBox label="Saldo do Período" value={formatCurrency(resumo.saldoMes)} />
              <StatBox label="Posição do Caixa" value={formatCurrency(resumo.posicaoCaixa)} />
            </div>
          )}

          {/* Modalidades */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Desencaixes por Modalidade</h4>
            <div className="grid grid-cols-3 gap-3">
              {modalidades.map(m => (
                <div key={m.nome} className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">{m.nome}</p>
                  <p className="font-bold text-sm">{formatCurrency(m.valor)}</p>
                  <Badge variant="secondary" className="text-[10px] mt-1">{m.pct}%</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Documentation */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Documentação</h4>
            <div className="grid grid-cols-3 gap-3">
              <DocStat label="Nota Fiscal" ok={docStats.nfOk} pend={docStats.nfPend} />
              <DocStat label="Comprovante" ok={docStats.cpOk} pend={docStats.cpPend} />
              <DocStat label="Orçamento" ok={docStats.orOk} pend={docStats.orPend} />
            </div>
          </div>

          {/* Mão de Obra */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Mão de Obra — Marcos Noal</h4>
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Contratado" value={formatCurrency(maoDeObraMock.contratado)} />
              <StatBox label="Realizado" value={formatCurrency(maoDeObraMock.realizado)} />
              <StatBox label="Saldo" value={formatCurrency(maoDeObraMock.saldo)} />
            </div>
          </div>

          {/* Administração */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Administração</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatBox label="Contratado" value={formatCurrency(administracaoMock.contratado)} />
              <StatBox label="André" value={formatCurrency(administracaoMock.realizadoAndre)} />
              <StatBox label="Marcos" value={formatCurrency(administracaoMock.realizadoMarcos)} />
              <StatBox label="Saldo" value={formatCurrency(administracaoMock.saldo)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function DocStat({ label, ok, pend }: { label: string; ok: number; pend: number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="flex gap-2 mt-1">
        <Badge variant="outline" className="status-ok text-[10px]">OK: {ok}</Badge>
        <Badge variant="outline" className="status-missing text-[10px]">Pend: {pend}</Badge>
      </div>
    </div>
  );
}
