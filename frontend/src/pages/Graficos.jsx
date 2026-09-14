import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { brl } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16", "#F97316", "#14B8A6"];
const tooltipStyle = { borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" };

function ChartCard({ title, children, testid, empty }) {
  return (
    <Card className="p-5" data-testid={testid}>
      <h3 className="font-heading font-semibold mb-4">{title}</h3>
      {empty ? <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Sem dados suficientes.</div> : children}
    </Card>
  );
}

export default function Graficos() {
  const { year, person, refreshKey } = useApp();
  const [a, setA] = useState(null);

  useEffect(() => {
    api.get("/analytics", { params: { person, year } }).then((r) => setA(r.data));
  }, [person, year, refreshKey]);

  if (!a) return <div className="text-muted-foreground">Carregando gráficos...</div>;

  return (
    <div>
      <PageHeader title="Gráficos & Análises" subtitle="Visualize a evolução financeira do casal. Use os filtros no topo." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Entradas x Saídas por mês" testid="g-entradas-saidas" empty={!a.entradas_saidas?.length}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={a.entradas_saidas}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => brl(v)} contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="entradas" name="Entradas" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#EF4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolução do Saldo" testid="g-saldo" empty={!a.saldo_evolucao?.length}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={a.saldo_evolucao}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => brl(v)} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#10B981" strokeWidth={2} fill="url(#sg)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gastos por Categoria" testid="g-categoria" empty={!a.gastos_categoria?.length}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={a.gastos_categoria} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={100}>
                {a.gastos_categoria?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => brl(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gastos por Pessoa" testid="g-gastos-pessoa" empty={!a.gastos_pessoa?.some((x) => x.valor > 0)}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={a.gastos_pessoa} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="pessoa" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={100} />
              <Tooltip formatter={(v) => brl(v)} contentStyle={tooltipStyle} />
              <Bar dataKey="valor" name="Gasto" fill="#EF4444" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Entradas por Pessoa" testid="g-entradas-pessoa" empty={!a.entradas_pessoa?.some((x) => x.valor > 0)}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={a.entradas_pessoa} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="pessoa" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={100} />
              <Tooltip formatter={(v) => brl(v)} contentStyle={tooltipStyle} />
              <Bar dataKey="valor" name="Recebido" fill="#10B981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Contas Pagas x Pendentes" testid="g-contas-status" empty={!a.contas_status?.some((x) => x.valor > 0)}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={a.contas_status} dataKey="valor" nameKey="nome" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                <Cell fill="#10B981" />
                <Cell fill="#F59E0B" />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
