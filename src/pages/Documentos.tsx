import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Image, Eye, Download } from "lucide-react";
import { lancamentosMock, formatDate } from "@/data/mockData";

const docsMock = [
  { id: "d1", lancamentoId: "1", tipo: "CP" as const, nomeArquivo: "comprovante_marcos_jan.pdf", data: "2024-01-10" },
  { id: "d2", lancamentoId: "3", tipo: "NF" as const, nomeArquivo: "nf_leroy_hidraulico.pdf", data: "2024-01-16" },
  { id: "d3", lancamentoId: "3", tipo: "OR" as const, nomeArquivo: "orcamento_leroy.pdf", data: "2024-01-11" },
  { id: "d4", lancamentoId: "8", tipo: "NF" as const, nomeArquivo: "nf_madeireira.pdf", data: "2024-02-16" },
  { id: "d5", lancamentoId: "12", tipo: "CP" as const, nomeArquivo: "pix_deca.jpg", data: "2024-03-18" },
];

const tipoLabels: Record<string, { label: string; color: string }> = {
  CP: { label: "Comprovante", color: "bg-info/10 text-info" },
  CT: { label: "Transferência", color: "bg-primary/10 text-primary" },
  OR: { label: "Orçamento", color: "bg-warning/10 text-warning" },
  NF: { label: "Nota Fiscal", color: "bg-success/10 text-success" },
};

export default function Documentos() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload area */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-1">Upload de Documento</h3>
            <p className="text-sm text-muted-foreground mb-3">Arraste arquivos ou clique para selecionar (PDF ou imagem)</p>
            <Button variant="outline" size="sm">Selecionar Arquivo</Button>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(tipoLabels).map(([key, { label, color }]) => (
          <Badge key={key} variant="outline" className={`${color} text-xs`}>{key} — {label}</Badge>
        ))}
      </div>

      {/* Documents list */}
      <Card>
        <CardHeader><CardTitle className="text-base">Documentos Anexados</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {docsMock.map(doc => {
              const lanc = lancamentosMock.find(l => l.id === doc.lancamentoId);
              const tl = tipoLabels[doc.tipo];
              const isImage = doc.nomeArquivo.match(/\.(jpg|jpeg|png|webp)$/i);
              return (
                <div key={doc.id} className="flex items-center gap-4 px-4 py-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tl.color}`}>
                    {isImage ? <Image className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.nomeArquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {lanc?.fornecedor} • {formatDate(doc.data)}
                    </p>
                  </div>
                  <Badge variant="outline" className={`${tl.color} text-xs`}>{doc.tipo}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
