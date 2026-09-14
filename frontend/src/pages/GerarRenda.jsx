import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { brl, RESPONSAVEIS } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Rocket, Target } from "lucide-react";

const OPP_STATUS = [
  { value: "ideia", label: "Ideia" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

export default function GerarRenda() {
  const [goals, setGoals] = useState([]);
  const [opps, setOpps] = useState([]);
  const [goalDlg, setGoalDlg] = useState({ open: false, item: null });
  const [oppDlg, setOppDlg] = useState({ open: false, item: null });
  const [confirm, setConfirm] = useState({ open: false, kind: null, id: null });

  const load = useCallback(() => {
    api.get("/goals").then((r) => setGoals(r.data));
    api.get("/opportunities").then((r) => setOpps(r.data));
  }, []);
  useEffect(() => { load(); }, [load]);

  const delItem = async () => {
    await api.delete(`/${confirm.kind}/${confirm.id}`);
    toast.success("Excluído.");
    setConfirm({ open: false, kind: null, id: null });
    load();
  };

  return (
    <div>
      <PageHeader title="Gerar Renda Extra" subtitle="Defina metas de renda e cadastre oportunidades para gerar dinheiro adicional." />

      {/* Metas */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-emerald-600" /> Metas de Renda</h3>
        <Button size="sm" data-testid="add-goal-btn" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setGoalDlg({ open: true, item: null })}>
          <Plus className="h-4 w-4 mr-1" /> Nova Meta
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {goals.length === 0 && <Card className="p-8 text-center text-muted-foreground md:col-span-2 xl:col-span-3">Nenhuma meta cadastrada. Ex: "Precisamos gerar R$ 500".</Card>}
        {goals.map((g) => {
          const meta = Number(g.valor_meta || 0);
          const atual = Number(g.valor_atual || 0);
          const pct = meta ? Math.min(100, (atual / meta) * 100) : 0;
          const falta = Math.max(0, meta - atual);
          return (
            <Card key={g.id} className="p-5" data-testid={`goal-${g.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{g.titulo}</p>
                  <Badge variant="outline" className="mt-1">{pct >= 100 ? "Concluída" : "Ativa"}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setGoalDlg({ open: true, item: g })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setConfirm({ open: true, kind: "goals", id: g.id })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-4">
                <Progress value={pct} className="h-2" />
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Gerado: <b className="text-emerald-600 font-mono">{brl(atual)}</b></span>
                  <span className="text-muted-foreground">Meta: <b className="font-mono">{brl(meta)}</b></span>
                </div>
                <p className="text-xs mt-1 text-muted-foreground">{falta > 0 ? <>Faltam <b className="text-rose-600 font-mono">{brl(falta)}</b></> : "🎉 Meta atingida!"}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Oportunidades */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold flex items-center gap-2"><Rocket className="h-4 w-4 text-blue-600" /> Oportunidades de Renda</h3>
        <Button size="sm" data-testid="add-opp-btn" className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => setOppDlg({ open: true, item: null })}>
          <Plus className="h-4 w-4 mr-1" /> Nova Oportunidade
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {opps.length === 0 && <Card className="p-8 text-center text-muted-foreground md:col-span-2 xl:col-span-3">Nenhuma oportunidade. Ex: Freelancer, venda de usados, entregas...</Card>}
        {opps.map((o) => (
          <Card key={o.id} className="p-5" data-testid={`opp-${o.id}`}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-medium truncate">{o.nome}</p>
                <Badge variant="outline" className="mt-1">{OPP_STATUS.find((s) => s.value === o.status)?.label || o.status}</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOppDlg({ open: true, item: o })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setConfirm({ open: true, kind: "opportunities", id: o.id })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            {o.descricao && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{o.descricao}</p>}
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Potencial</span><p className="font-mono font-semibold text-emerald-600">{brl(o.potencial_ganho)}</p></div>
              <div><span className="text-muted-foreground text-xs">Custo inicial</span><p className="font-mono">{brl(o.custo_inicial)}</p></div>
            </div>
          </Card>
        ))}
      </div>

      <GoalDialog dlg={goalDlg} setDlg={setGoalDlg} onSaved={load} />
      <OppDialog dlg={oppDlg} setDlg={setOppDlg} onSaved={load} />
      <ConfirmDialog open={confirm.open} onOpenChange={(o) => setConfirm({ ...confirm, open: o })} onConfirm={delItem} />
    </div>
  );
}

function GoalDialog({ dlg, setDlg, onSaved }) {
  const [f, setF] = useState({});
  useEffect(() => { if (dlg.open) setF(dlg.item || { titulo: "", valor_meta: "", valor_atual: 0, prazo: "", status: "ativa" }); }, [dlg]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.titulo || !f.valor_meta) return toast.error("Preencha título e valor da meta.");
    const payload = { ...f, valor_meta: Number(f.valor_meta), valor_atual: Number(f.valor_atual || 0) };
    if (dlg.item?.id) await api.put(`/goals/${dlg.item.id}`, payload); else await api.post("/goals", payload);
    toast.success("Meta salva.");
    setDlg({ open: false, item: null });
    onSaved();
  };
  return (
    <Dialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: o ? dlg.item : null })}>
      <DialogContent data-testid="goal-dialog">
        <DialogHeader><DialogTitle>{dlg.item ? "Editar" : "Nova"} Meta de Renda</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Título *</Label><Input data-testid="goal-titulo" value={f.titulo || ""} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex: Renda extra de dezembro" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Meta (R$) *</Label><Input data-testid="goal-meta" type="number" step="0.01" value={f.valor_meta ?? ""} onChange={(e) => set("valor_meta", e.target.value)} /></div>
            <div className="space-y-2"><Label>Já gerado (R$)</Label><Input data-testid="goal-atual" type="number" step="0.01" value={f.valor_atual ?? ""} onChange={(e) => set("valor_atual", e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={(f.prazo || "").slice(0, 10)} onChange={(e) => set("prazo", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDlg({ open: false, item: null })}>Cancelar</Button>
          <Button data-testid="goal-save" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OppDialog({ dlg, setDlg, onSaved }) {
  const [f, setF] = useState({});
  useEffect(() => { if (dlg.open) setF(dlg.item || { nome: "", descricao: "", potencial_ganho: "", custo_inicial: "", tempo_necessario: "", prazo: "", responsavel: "ambos", status: "ideia", observacoes: "" }); }, [dlg]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.nome) return toast.error("Informe o nome.");
    const payload = { ...f, potencial_ganho: Number(f.potencial_ganho || 0), custo_inicial: Number(f.custo_inicial || 0) };
    if (dlg.item?.id) await api.put(`/opportunities/${dlg.item.id}`, payload); else await api.post("/opportunities", payload);
    toast.success("Oportunidade salva.");
    setDlg({ open: false, item: null });
    onSaved();
  };
  return (
    <Dialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: o ? dlg.item : null })}>
      <DialogContent className="max-w-lg" data-testid="opp-dialog">
        <DialogHeader><DialogTitle>{dlg.item ? "Editar" : "Nova"} Oportunidade</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2"><Label>Nome *</Label><Input data-testid="opp-nome" value={f.nome || ""} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Freelancer de design" /></div>
          <div className="col-span-2 space-y-2"><Label>Descrição</Label><Textarea value={f.descricao || ""} onChange={(e) => set("descricao", e.target.value)} rows={2} /></div>
          <div className="space-y-2"><Label>Potencial (R$)</Label><Input type="number" step="0.01" value={f.potencial_ganho ?? ""} onChange={(e) => set("potencial_ganho", e.target.value)} /></div>
          <div className="space-y-2"><Label>Custo inicial (R$)</Label><Input type="number" step="0.01" value={f.custo_inicial ?? ""} onChange={(e) => set("custo_inicial", e.target.value)} /></div>
          <div className="space-y-2"><Label>Tempo necessário</Label><Input value={f.tempo_necessario || ""} onChange={(e) => set("tempo_necessario", e.target.value)} placeholder="Ex: 10h/semana" /></div>
          <div className="space-y-2"><Label>Prazo</Label><Input value={f.prazo || ""} onChange={(e) => set("prazo", e.target.value)} placeholder="Ex: 30 dias" /></div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={f.responsavel} onValueChange={(v) => set("responsavel", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RESPONSAVEIS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger data-testid="opp-status"><SelectValue /></SelectTrigger>
              <SelectContent>{OPP_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDlg({ open: false, item: null })}>Cancelar</Button>
          <Button data-testid="opp-save" className="bg-blue-500 hover:bg-blue-600 text-white" onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
