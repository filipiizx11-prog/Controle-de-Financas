import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Bell } from "lucide-react";

const FREQ = [
  { value: "uma_vez", label: "Uma vez" },
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
];

export default function Lembretes() {
  const [rows, setRows] = useState([]);
  const [dlg, setDlg] = useState({ open: false, item: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const load = useCallback(() => { api.get("/reminders").then((r) => setRows(r.data)); }, []);
  useEffect(() => { load(); }, [load]);

  const del = async () => { await api.delete(`/reminders/${confirm.id}`); toast.success("Lembrete excluído."); setConfirm({ open: false, id: null }); load(); };

  const sorted = [...rows].sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0));

  return (
    <div>
      <PageHeader title="Lembretes" subtitle="Nunca esqueça de pagar, transferir ou verificar algo.">
        <Button data-testid="add-reminder-btn" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setDlg({ open: true, item: null })}>
          <Plus className="h-4 w-4 mr-1" /> Novo Lembrete
        </Button>
      </PageHeader>

      {sorted.length === 0 ? (
        <Card className="p-14 text-center text-muted-foreground"><Bell className="h-10 w-10 mx-auto mb-3 opacity-50" /> Nenhum lembrete.</Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <Card key={r.id} className="p-4 flex items-start gap-3" data-testid={`reminder-${r.id}`}>
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><Bell className="h-4 w-4 text-amber-600" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.titulo}</p>
                {r.descricao && <p className="text-sm text-muted-foreground mt-0.5">{r.descricao}</p>}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {r.data && <span className="text-xs text-muted-foreground">{formatDate(r.data)}{r.hora ? ` · ${r.hora}` : ""}</span>}
                  <Badge variant="outline">{FREQ.find((f) => f.value === r.frequencia)?.label || r.frequencia}</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDlg({ open: true, item: r })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setConfirm({ open: true, id: r.id })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ReminderDialog dlg={dlg} setDlg={setDlg} onSaved={load} />
      <ConfirmDialog open={confirm.open} onOpenChange={(o) => setConfirm({ open: o, id: o ? confirm.id : null })} title="Excluir este lembrete?" onConfirm={del} />
    </div>
  );
}

function ReminderDialog({ dlg, setDlg, onSaved }) {
  const [f, setF] = useState({});
  useEffect(() => { if (dlg.open) setF(dlg.item || { titulo: "", descricao: "", data: new Date().toISOString().slice(0, 10), hora: "", frequencia: "uma_vez", tipo: "personalizado" }); }, [dlg]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.titulo) return toast.error("Informe o título.");
    if (dlg.item?.id) await api.put(`/reminders/${dlg.item.id}`, f); else await api.post("/reminders", f);
    toast.success("Lembrete salvo.");
    setDlg({ open: false, item: null });
    onSaved();
  };
  return (
    <Dialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: o ? dlg.item : null })}>
      <DialogContent data-testid="reminder-dialog">
        <DialogHeader><DialogTitle>{dlg.item ? "Editar" : "Novo"} Lembrete</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2"><Label>Título *</Label><Input data-testid="reminder-titulo" value={f.titulo || ""} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex: Pagar internet dia 10" /></div>
          <div className="col-span-2 space-y-2"><Label>Descrição</Label><Textarea value={f.descricao || ""} onChange={(e) => set("descricao", e.target.value)} rows={2} /></div>
          <div className="space-y-2"><Label>Data</Label><Input type="date" value={(f.data || "").slice(0, 10)} onChange={(e) => set("data", e.target.value)} /></div>
          <div className="space-y-2"><Label>Hora</Label><Input type="time" value={f.hora || ""} onChange={(e) => set("hora", e.target.value)} /></div>
          <div className="col-span-2 space-y-2">
            <Label>Frequência</Label>
            <Select value={f.frequencia} onValueChange={(v) => set("frequencia", v)}>
              <SelectTrigger data-testid="reminder-freq"><SelectValue /></SelectTrigger>
              <SelectContent>{FREQ.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDlg({ open: false, item: null })}>Cancelar</Button>
          <Button data-testid="reminder-save" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
