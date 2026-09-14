import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { brl, MONTHS } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const KIND_COLOR = {
  entrada: "bg-emerald-500",
  saida: "bg-rose-500",
  tarefa: "bg-blue-500",
  lembrete: "bg-amber-500",
};
const KIND_LABEL = { entrada: "Entrada", saida: "Saída", tarefa: "Tarefa", lembrete: "Lembrete" };

export default function Calendario() {
  const { month, year, refreshKey } = useApp();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    api.get("/calendar", { params: { year, month } }).then((r) => setEvents(r.data));
  }, [month, year, refreshKey]);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const evByDay = (d) => events.filter((e) => Number(e.date.slice(8, 10)) === d);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Calendário Financeiro" subtitle={`${MONTHS[month - 1]} de ${year} — contas, entradas, tarefas e lembretes.`} />

      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {Object.entries(KIND_LABEL).map(([k, l]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${KIND_COLOR[k]}`} /> {l}</span>
        ))}
      </div>

      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1 mb-1 text-center text-xs font-semibold text-muted-foreground">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[72px] sm:min-h-[96px]" />;
            const dayEvents = evByDay(d);
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            return (
              <button
                key={i}
                data-testid={`cal-day-${d}`}
                onClick={() => dayEvents.length && setSel({ d, events: dayEvents })}
                className={`min-h-[72px] sm:min-h-[96px] rounded-lg border p-1.5 text-left transition-colors duration-150 hover:bg-muted/60 ${isToday ? "border-emerald-500 bg-emerald-500/5" : "border-border"}`}
              >
                <span className={`text-xs font-semibold ${isToday ? "text-emerald-600" : "text-foreground"}`}>{d}</span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e, j) => (
                    <div key={j} className="flex items-center gap-1 text-[10px] truncate">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${KIND_COLOR[e.type] || "bg-slate-400"}`} />
                      <span className="truncate text-muted-foreground">{e.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} mais</span>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent data-testid="cal-day-dialog">
          <DialogHeader><DialogTitle>Dia {sel?.d} de {MONTHS[month - 1]}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {sel?.events.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <span className={`h-2.5 w-2.5 rounded-full ${KIND_COLOR[e.type] || "bg-slate-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{KIND_LABEL[e.type] || e.type}</p>
                </div>
                {e.valor != null && (e.type === "entrada" || e.type === "saida") && (
                  <span className={`font-mono text-sm font-semibold ${e.type === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>{brl(e.valor)}</span>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
