import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

interface UploadStatus {
  id: string;
  nome_arquivo: string;
  status: "pendente" | "processando" | "concluido" | "erro";
  erro_msg?: string | null;
}

interface ProcessingStatusProps {
  uploads: UploadStatus[];
}

export default function ProcessingStatus({ uploads }: ProcessingStatusProps) {
  const total = uploads.length;
  const concluidos = uploads.filter((u) => u.status === "concluido").length;
  const erros = uploads.filter((u) => u.status === "erro").length;
  const progresso = total > 0 ? Math.round(((concluidos + erros) / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Processando documentos...</p>
          <span className="text-sm text-muted-foreground">{concluidos}/{total}</span>
        </div>
        <Progress value={progresso} className="h-2" />
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-2 text-sm">
              {u.status === "concluido" && <CheckCircle className="w-4 h-4 text-success" />}
              {u.status === "processando" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              {u.status === "pendente" && <Loader2 className="w-4 h-4 text-muted-foreground" />}
              {u.status === "erro" && <XCircle className="w-4 h-4 text-destructive" />}
              <span className="flex-1 truncate">{u.nome_arquivo}</span>
              {u.status === "erro" && u.erro_msg && (
                <span className="text-xs text-destructive truncate max-w-[200px]">{u.erro_msg}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
