import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { brl, MONTHS } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, Minus, Equal, AlertTriangle, CheckCircle2 } from "lucide-react";

function Row({ label, value, icon: Icon, op, tone }) {
  const tones = { green: "text-emerald-600", red: "text-rose-600", blue: "text-blue-600", slate: "text-foreground" };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      {op && <span className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">{op}</span>}
      {Icon && <Icon className={`h-4 w-4 ${tones[tone]}`} />}
      <span className="text-sm font-medium">{label}</span>
      <span className={`ml-auto font-mono font-semibold ${tones[tone]}`}>{brl(value)}</span>
    </div>
  );
}

export default function Planejamento() {
  const { month, year, person, refreshKey } = useApp();
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get("/dashboard", { params: { person, year, month } }).then((r) => setD(r.data));
  }, [person, year, month, refreshKey]);

  if (!d) return <div className="text-muted-foreground">Carregando...</div>;

  const saldoInicial = d.saldo_atual - d.entradas_mes + d.saidas_mes;
  const podeGastar = Math.max(0, d.valor_disponivel);
  const deficit = d.valor_para_fechar > 0;

  return (
    <div>
      <PageHeader title="Planejamento do Mês" subtitle={`Projeção financeira para ${MONTHS[month - 1]} de ${year}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2" data-testid="planning-waterfall">
          <h3 className="font-heading font-semibold mb-2">Composição do Saldo Projetado</h3>
          <p className="text-xs text-muted-foreground mb-4">Como chegamos ao valor que sobrará no fim do mês.</p>
          <Row label="Saldo inicial" value={saldoInicial} op={<Wallet className="h-4 w-4" />} tone="slate" />
          <Row label="Entradas previstas (a receber)" value={d.total_a_receber} op={<Plus className="h-4 w-4" />} tone="green" />
          <Row label="Entradas já recebidas no mês" value={d.entradas_mes} op={<Plus className="h-4 w-4" />} tone="green" />
          <Row label="Contas já pagas" value={d.contas_pagas} op={<Minus className="h-4 w-4" />} tone="red" />
          <Row label="Contas pendentes" value={d.contas_pendentes} op={<Minus className="h-4 w-4" />} tone="red" />
          <Row label="Contas vencidas" value={d.contas_vencidas} op={<Minus className="h-4 w-4" />} tone="red" />
          <div className="flex items-center gap-3 pt-4 mt-2">
            <span className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0"><Equal className="h-4 w-4" /></span>
            <span className="text-base font-heading font-bold">Saldo Projetado</span>
            <span className={`ml-auto font-mono text-xl font-bold ${d.saldo_projetado >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{brl(d.saldo_projetado)}</span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className={`p-6 border-0 text-white ${deficit ? "bg-rose-500" : "bg-emerald-500"}`} data-testid="planning-status">
            <div className="flex items-center gap-2 mb-3">
              {deficit ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              <span className="font-heading font-bold">{deficit ? "Atenção" : "Situação saudável"}</span>
            </div>
            {deficit ? (
              <p className="text-sm/relaxed">
                Existe um déficit projetado de <b>{brl(d.valor_para_fechar)}</b>. Você precisa reduzir despesas ou gerar aproximadamente <b>{brl(d.renda_adicional)}</b> em renda adicional.
              </p>
            ) : (
              <p className="text-sm/relaxed">As entradas cobrem todas as contas do mês. Há folga no orçamento.</p>
            )}
          </Card>

          <Card className="p-6" data-testid="planning-can-spend">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <PiggyBank className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Quanto podemos gastar até o fim do mês?</span>
            </div>
            <p className="font-mono text-3xl font-bold">{brl(podeGastar)}</p>
            <p className="text-xs text-muted-foreground mt-1">Disponível após cobrir as contas pendentes.</p>
          </Card>

          <Card className="p-6" data-testid="planning-save">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Quanto precisamos economizar / gerar?</span>
            </div>
            <p className={`font-mono text-3xl font-bold ${deficit ? "text-rose-600" : "text-emerald-600"}`}>{brl(d.renda_adicional)}</p>
            <p className="text-xs text-muted-foreground mt-1">{deficit ? "Para fechar o mês sem déficit." : "Nenhuma renda extra necessária."}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
