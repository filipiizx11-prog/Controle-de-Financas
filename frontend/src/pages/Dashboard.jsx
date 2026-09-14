import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { brl, formatDate, MONTHS, statusBadge, daysUntil } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wallet, TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle,
  HandCoins, PiggyBank, Rocket, ArrowRight, CircleDollarSign,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16"];

const HEALTH_STYLES = {
  positive: { bg: "bg-emerald-500", ring: "ring-emerald-500/20", text: "text-white", icon: CheckCircle2 },
  warning: { bg: "bg-amber-500", ring: "ring-amber-500/20", text: "text-white", icon: AlertTriangle },
  critical: { bg: "bg-rose-500", ring: "ring-rose-500/20", text: "text-white", icon: AlertTriangle },
};

function StatCard({ title, value, sub, icon: Icon, tone = "blue", testid }) {
  const tones = {
    green: "text-emerald-600 bg-emerald-500/10",
    red: "text-rose-600 bg-rose-500/10",
    yellow: "text-amber-600 bg-amber-500/10",
    blue: "text-blue-600 bg-blue-500/10",
    slate: "text-slate-600 bg-slate-500/10",
  };
  return (
    <Card className="p-5 hover:shadow-md transition-shadow duration-200" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl font-heading font-bold mt-2 font-mono">{brl(value)}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { month, year, person, refreshKey } = useApp();
  const [d, setD] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    api.get("/dashboard", { params: { person, year, month } }).then((r) => setD(r.data));
    api.get("/analytics", { params: { person, year } }).then((r) => setAnalytics(r.data));
    api.get("/transactions", { params: { tipo: "saida", person, status: "pendente" } }).then((r) => {
      const rows = r.data
        .filter((t) => t.vencimento)
        .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))
        .slice(0, 6);
      setUpcoming(rows);
    });
  }, [person, year, month, refreshKey]);

  if (!d) return <div className="text-muted-foreground">Carregando painel...</div>;
  const hs = HEALTH_STYLES[d.health];
  const HIcon = hs.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">Painel do Casal</h1>
          <p className="text-muted-foreground text-sm mt-1">{MONTHS[month - 1]} de {year} — situação financeira em poucos segundos.</p>
        </div>
      </div>

      {/* Health banner */}
      <Card className={`p-5 sm:p-6 ${hs.bg} ${hs.text} ring-4 ${hs.ring} border-0`} data-testid="health-banner">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <HIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm/relaxed opacity-90 font-medium uppercase tracking-wider">
              {d.health === "positive" ? "Situação positiva" : d.health === "warning" ? "Atenção" : "Situação crítica"}
            </p>
            <p className="text-lg sm:text-xl font-heading font-bold">{d.health_msg}</p>
          </div>
          <div className="ml-auto text-right hidden md:block">
            <p className="text-sm opacity-90">Saldo projetado</p>
            <p className="text-2xl font-bold font-mono">{brl(d.saldo_projetado)}</p>
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saldo Atual" value={d.saldo_atual} sub="Realizado (entradas − saídas)" icon={Wallet} tone={d.saldo_atual >= 0 ? "green" : "red"} testid="card-saldo-atual" />
        <StatCard title="Entradas do Mês" value={d.entradas_mes} sub="Recebido no período" icon={TrendingUp} tone="green" testid="card-entradas" />
        <StatCard title="Saídas do Mês" value={d.saidas_mes} sub="Pago no período" icon={TrendingDown} tone="red" testid="card-saidas" />
        <StatCard title="Contas Pagas" value={d.contas_pagas} sub="Quitadas no mês" icon={CheckCircle2} tone="green" testid="card-pagas" />
        <StatCard title="Contas Pendentes" value={d.contas_pendentes} sub="Aguardando pagamento" icon={Clock} tone="yellow" testid="card-pendentes" />
        <StatCard title="Contas Vencidas" value={d.contas_vencidas} sub="Atenção imediata" icon={AlertTriangle} tone="red" testid="card-vencidas" />
        <StatCard title="Total a Receber" value={d.total_a_receber} sub="Entradas previstas" icon={HandCoins} tone="blue" testid="card-receber" />
        <StatCard title="Saldo Projetado" value={d.saldo_projetado} sub="Após pagar as contas" icon={PiggyBank} tone={d.saldo_projetado >= 0 ? "green" : "red"} testid="card-projetado" />
        <StatCard title="Valor p/ Fechar o Mês" value={d.valor_para_fechar} sub={d.valor_para_fechar > 0 ? "Necessário cobrir" : "Nada pendente"} icon={CircleDollarSign} tone={d.valor_para_fechar > 0 ? "red" : "green"} testid="card-fechar" />
        <StatCard title="Disponível p/ Gastos" value={d.valor_disponivel} sub="Livre após contas" icon={Wallet} tone={d.valor_disponivel >= 0 ? "blue" : "red"} testid="card-disponivel" />
        <StatCard title="Renda Adicional Necessária" value={d.renda_adicional} sub={d.renda_adicional > 0 ? "Gerar renda extra" : "Meta atingida"} icon={Rocket} tone={d.renda_adicional > 0 ? "yellow" : "green"} testid="card-renda-adicional" />
        <Card className="p-5 flex flex-col justify-center bg-[#0D131F] text-white border-0" data-testid="card-cta">
          <p className="text-sm font-medium text-slate-300">Precisa de renda extra?</p>
          <p className="text-xs text-slate-400 mt-1 mb-3">Cadastre oportunidades e metas.</p>
          <Link to="/gerar-renda">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white w-full">
              Gerar Renda <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2" data-testid="chart-entradas-saidas">
          <h3 className="font-heading font-semibold mb-4">Entradas x Saídas (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics?.entradas_saidas || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => brl(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }} />
              <Legend />
              <Bar dataKey="entradas" name="Entradas" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#EF4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5" data-testid="chart-categorias">
          <h3 className="font-heading font-semibold mb-4">Gastos por Categoria</h3>
          {analytics?.gastos_categoria?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={analytics.gastos_categoria.slice(0, 8)} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {analytics.gastos_categoria.slice(0, 8).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => brl(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Sem despesas pagas ainda.</div>
          )}
        </Card>
      </div>

      {/* Upcoming bills */}
      <Card className="p-5" data-testid="upcoming-bills">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold">Contas próximas do vencimento</h3>
          <Link to="/contas-pagar" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            Ver todas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma conta pendente. 🎉</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((t) => {
              const dias = daysUntil(t.vencimento);
              const sb = statusBadge(t.status_display || t.status);
              return (
                <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${dias < 0 ? "bg-rose-500" : dias <= 7 ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{t.descricao}</p>
                    <p className="text-xs text-muted-foreground">Vence {formatDate(t.vencimento)} · {dias < 0 ? `${Math.abs(dias)}d atrasada` : dias === 0 ? "hoje" : `em ${dias}d`}</p>
                  </div>
                  <Badge variant="outline" className={sb.cls}>{sb.label}</Badge>
                  <span className="font-mono font-semibold text-rose-600 text-sm w-28 text-right">{brl(t.valor)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
