import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { brl, MONTHS, RESPONSAVEIS } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, FileSpreadsheet } from "lucide-react";

const respLabel = (v) => RESPONSAVEIS.find((r) => r.value === v)?.label || v;

const LEVEL_COLOR = {
  ok: "bg-emerald-500", aviso: "bg-blue-500", atencao: "bg-amber-500", atingido: "bg-amber-500", excedido: "bg-rose-500",
};
const LEVEL_LABEL = {
  ok: "Dentro do orçamento", aviso: "50%+ utilizado", atencao: "80%+ atenção", atingido: "Limite atingido", excedido: "Excedido!",
};

export default function Relatorios() {
  const { month, year, person, refreshKey } = useApp();
  const [d, setD] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [budget, setBudget] = useState([]);
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    api.get("/dashboard", { params: { person, year, month } }).then((r) => setD(r.data));
    api.get("/analytics", { params: { person, year } }).then((r) => setAnalytics(r.data));
    api.get("/budget", { params: { year, month } }).then((r) => setBudget(r.data));
    api.get("/transactions", { params: { person, year, month } }).then((r) => setTxs(r.data));
  }, [month, year, person, refreshKey]);

  const exportCSV = () => {
    const header = ["Tipo", "Data", "Vencimento", "Descrição", "Categoria", "Responsável", "Status", "Valor"];
    const lines = txs.map((t) => [
      t.tipo, t.data || "", t.vencimento || t.data_prevista || "", `"${(t.descricao || "").replace(/"/g, '""')}"`,
      t.categoria || "", respLabel(t.responsavel), t.status_display || t.status, String(t.valor).replace(".", ","),
    ].join(";"));
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${MONTHS[month - 1]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!d) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div>
      <PageHeader title="Relatórios" subtitle={`Resumo financeiro de ${MONTHS[month - 1]} de ${year}.`}>
        <Button data-testid="export-csv-btn" variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ["Entradas", d.entradas_mes, "text-emerald-600"],
          ["Saídas", d.saidas_mes, "text-rose-600"],
          ["Contas pagas", d.contas_pagas, "text-emerald-600"],
          ["Pendentes", d.contas_pendentes + d.contas_vencidas, "text-amber-600"],
        ].map(([l, v, c]) => (
          <Card key={l} className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{l}</p>
            <p className={`font-mono text-xl font-bold mt-1 ${c}`}>{brl(v)}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="categoria">
        <TabsList>
          <TabsTrigger value="categoria" data-testid="tab-categoria">Por Categoria</TabsTrigger>
          <TabsTrigger value="pessoa" data-testid="tab-pessoa">Por Pessoa</TabsTrigger>
          <TabsTrigger value="orcamento" data-testid="tab-orcamento">Orçamento</TabsTrigger>
        </TabsList>

        <TabsContent value="categoria" className="mt-4">
          <Card className="p-5">
            <h3 className="font-heading font-semibold mb-4">Gastos por Categoria (ano)</h3>
            {analytics?.gastos_categoria?.length ? analytics.gastos_categoria.map((c) => (
              <div key={c.categoria} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm">{c.categoria}</span>
                <span className="font-mono font-semibold text-rose-600">{brl(c.valor)}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">Sem gastos registrados.</p>}
          </Card>
        </TabsContent>

        <TabsContent value="pessoa" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-heading font-semibold mb-3">Entradas por Pessoa</h3>
              {analytics?.entradas_pessoa?.map((p) => (
                <div key={p.pessoa} className="flex justify-between py-2 border-b border-border last:border-0"><span className="text-sm">{p.pessoa}</span><span className="font-mono font-semibold text-emerald-600">{brl(p.valor)}</span></div>
              ))}
            </Card>
            <Card className="p-5">
              <h3 className="font-heading font-semibold mb-3">Gastos por Pessoa</h3>
              {analytics?.gastos_pessoa?.map((p) => (
                <div key={p.pessoa} className="flex justify-between py-2 border-b border-border last:border-0"><span className="text-sm">{p.pessoa}</span><span className="font-mono font-semibold text-rose-600">{brl(p.valor)}</span></div>
              ))}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orcamento" className="mt-4">
          <Card className="p-5">
            <h3 className="font-heading font-semibold mb-4">Orçamento por Categoria</h3>
            {budget.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum limite definido. Configure limites em <b>Configurações → Categorias</b>.</p>
            ) : budget.map((b) => (
              <div key={b.categoria} className="mb-4 last:mb-0" data-testid={`budget-${b.categoria}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{b.categoria}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">{brl(b.gasto)} / {brl(b.limite)}</span>
                    <Badge variant="outline" className={`${b.level === "excedido" ? "border-rose-500/30 text-rose-600" : b.level === "atencao" || b.level === "atingido" ? "border-amber-500/30 text-amber-600" : "border-emerald-500/30 text-emerald-600"}`}>{LEVEL_LABEL[b.level]}</Badge>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${LEVEL_COLOR[b.level]}`} style={{ width: `${Math.min(100, b.pct)}%` }} />
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
