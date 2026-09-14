import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatDate, RESPONSAVEIS } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, CheckSquare } from "lucide-react";

const PRIORIDADES = [
  { value: "baixa", label: "Baixa", cls: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  { value: "media", label: "Média", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "alta", label: "Alta", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "urgente", label: "Urgente", cls: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
];
const STATUS = [
  { value: "a_fazer", label: "A fazer" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];
const respLabel = (v) => RESPONSAVEIS.find((r) => r.value === v)?.label || v;

export default function Tarefas() {
  const [rows, setRows] = useState([]);
  const [dlg, setDlg] = useState({ open: false, item: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [filter, setFilter] = useState("all");

  const load = useCallback(() => { api.get("/tasks").then((r) => setRows(r.data)); }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (t) => {
    const ns = t.status === "concluida" ? "a_fazer" : "concluida";
    await api.put(`/tasks/${t.id}`, { ...t, status: ns });
    load();
  };
  const del = async () => {
    await api.delete(`/tasks/${confirm.id}`);
    toast.success("Tarefa excluída.");
    setConfirm({ open: false, id: null });
    load();
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div>
      <PageHeader title="Tarefas do Mês" subtitle="Organize compromissos e tarefas do casal.">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[150px]" data-testid="task-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button data-testid="add-task-btn" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setDlg({ open: true, item: null })}>
          <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
        </Button>
      </PageHeader>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="p-14 text-center text-muted-foreground">
            <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-50" /> Nenhuma tarefa.
          </Card>
        )}
        {filtered.map((t) => {
          const prio = PRIORIDADES.find((p) => p.value === t.prioridade);
          const done = t.status === "concluida";
          return (
            <Card key={t.id} className="p-4 flex items-start gap-3" data-testid={`task-${t.id}`}>
              <Checkbox checked={done} onCheckedChange={() => toggle(t)} className="mt-1" data-testid={`task-check-${t.id}`} />
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</p>
                {t.descricao && <p className="text-sm text-muted-foreground mt-0.5">{t.descricao}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {prio && <Badge variant="outline" className={prio.cls}>{prio.label}</Badge>}
                  <Badge variant="outline">{STATUS.find((s) => s.value === t.status)?.label}</Badge>
                  {t.data && <span className="text-xs text-muted-foreground">{formatDate(t.data)}{t.horario ? ` · ${t.horario}` : ""}</span>}
                  <span className="text-xs text-muted-foreground">· {respLabel(t.responsavel)}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDlg({ open: true, item: t })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setConfirm({ open: true, id: t.id })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          );
        })}
      </div>

      <TaskDialog dlg={dlg} setDlg={setDlg} onSaved={load} />
      <ConfirmDialog open={confirm.open} onOpenChange={(o) => setConfirm({ open: o, id: o ? confirm.id : null })} title="Excluir esta tarefa?" onConfirm={del} />
    </div>
  );
}

function TaskDialog({ dlg, setDlg, onSaved }) {
  const [f, setF] = useState({});
  useEffect(() => {
    if (dlg.open) setF(dlg.item || { titulo: "", descricao: "", data: new Date().toISOString().slice(0, 10), horario: "", responsavel: "ambos", prioridade: "media", categoria: "", status: "a_fazer", observacoes: "" });
  }, [dlg]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.titulo) return toast.error("Informe o título.");
    if (dlg.item?.id) await api.put(`/tasks/${dlg.item.id}`, f); else await api.post("/tasks", f);
    toast.success("Tarefa salva.");
    setDlg({ open: false, item: null });
    onSaved();
  };
  return (
    <Dialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: o ? dlg.item : null })}>
      <DialogContent className="max-w-lg" data-testid="task-dialog">
        <DialogHeader><DialogTitle>{dlg.item ? "Editar" : "Nova"} Tarefa</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2"><Label>Título *</Label><Input data-testid="task-titulo" value={f.titulo || ""} onChange={(e) => set("titulo", e.target.value)} /></div>
          <div className="col-span-2 space-y-2"><Label>Descrição</Label><Textarea value={f.descricao || ""} onChange={(e) => set("descricao", e.target.value)} rows={2} /></div>
          <div className="space-y-2"><Label>Data</Label><Input type="date" value={(f.data || "").slice(0, 10)} onChange={(e) => set("data", e.target.value)} /></div>
          <div className="space-y-2"><Label>Horário</Label><Input type="time" value={f.horario || ""} onChange={(e) => set("horario", e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={f.prioridade} onValueChange={(v) => set("prioridade", v)}>
              <SelectTrigger data-testid="task-prio"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORIDADES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger data-testid="task-status"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Responsável</Label>
            <Select value={f.responsavel} onValueChange={(v) => set("responsavel", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RESPONSAVEIS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDlg({ open: false, item: null })}>Cancelar</Button>
          <Button data-testid="task-save" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
