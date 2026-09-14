import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { RESPONSAVEIS, FREQUENCIAS } from "@/lib/format";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_ENTRADA = [
  { value: "previsto", label: "Previsto" },
  { value: "recebido", label: "Recebido" },
  { value: "cancelado", label: "Cancelado" },
];
const STATUS_SAIDA = [
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function TransactionDialog({ tipo, open, onOpenChange, item, onSaved }) {
  const { refresh } = useApp();
  const isEntrada = tipo === "entrada";
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({ formas_pagamento: [], contas: [], cartoes: [] });
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!open) return;
    api.get("/categories").then((r) => setCategories(r.data.filter((c) => c.tipo === tipo)));
    api.get("/settings").then((r) => setSettings(r.data));
    setForm(
      item
        ? { ...item }
        : {
            tipo,
            data: today(),
            vencimento: isEntrada ? null : today(),
            data_prevista: isEntrada ? today() : null,
            responsavel: "ambos",
            descricao: "",
            categoria: isEntrada ? "Salário" : "Outros",
            valor: "",
            forma_pagamento: "",
            conta: "",
            recorrente: false,
            frequencia: "unica",
            status: isEntrada ? "previsto" : "pendente",
            data_pagamento: null,
            observacoes: "",
          }
    );
  }, [open, item, tipo, isEntrada]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.descricao || !form.valor) {
      toast.error("Preencha descrição e valor.");
      return;
    }
    const payload = { ...form, tipo, valor: Number(form.valor) };
    try {
      if (item?.id) await api.put(`/transactions/${item.id}`, payload);
      else await api.post("/transactions", payload);
      toast.success(isEntrada ? "Entrada salva com sucesso." : "Saída salva com sucesso.");
      onOpenChange(false);
      refresh();
      onSaved && onSaved();
    } catch (e) {
      toast.error("Erro ao salvar.");
    }
  };

  const statusOptions = isEntrada ? STATUS_ENTRADA : STATUS_SAIDA;
  const pagamentoOpts = [...(settings.formas_pagamento || [])];
  const contaOpts = [...(settings.contas || []), ...(settings.cartoes || [])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="transaction-dialog">
        <DialogHeader>
          <DialogTitle>{item ? "Editar" : "Nova"} {isEntrada ? "Entrada" : "Saída"}</DialogTitle>
          <DialogDescription>Preencha os dados da {isEntrada ? "entrada" : "despesa"}.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Descrição *</Label>
            <Input data-testid="tx-descricao" value={form.descricao || ""} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex: Salário, Mercado..." />
          </div>

          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input data-testid="tx-valor" type="number" step="0.01" value={form.valor ?? ""} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={form.categoria || ""} onValueChange={(v) => set("categoria", v)}>
              <SelectTrigger data-testid="tx-categoria"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isEntrada ? "Data" : "Data de lançamento"}</Label>
            <Input data-testid="tx-data" type="date" value={(form.data || "").slice(0, 10)} onChange={(e) => set("data", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{isEntrada ? "Data prevista" : "Vencimento"}</Label>
            <Input
              data-testid="tx-venc"
              type="date"
              value={((isEntrada ? form.data_prevista : form.vencimento) || "").slice(0, 10)}
              onChange={(e) => set(isEntrada ? "data_prevista" : "vencimento", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={form.responsavel} onValueChange={(v) => set("responsavel", v)}>
              <SelectTrigger data-testid="tx-responsavel"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESPONSAVEIS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger data-testid="tx-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isEntrada ? "Forma de recebimento" : "Forma de pagamento"}</Label>
            <Select value={form.forma_pagamento || ""} onValueChange={(v) => set("forma_pagamento", v)}>
              <SelectTrigger data-testid="tx-forma"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {pagamentoOpts.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conta / Cartão</Label>
            <Select value={form.conta || ""} onValueChange={(v) => set("conta", v)}>
              <SelectTrigger data-testid="tx-conta"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contaOpts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label>Recorrente?</Label>
              <p className="text-xs text-muted-foreground">Gera os próximos lançamentos automaticamente.</p>
            </div>
            <Switch data-testid="tx-recorrente" checked={!!form.recorrente} onCheckedChange={(v) => set("recorrente", v)} />
          </div>
          {form.recorrente && (
            <div className="col-span-2 space-y-2">
              <Label>Frequência</Label>
              <Select value={form.frequencia || "mensal"} onValueChange={(v) => set("frequencia", v)}>
                <SelectTrigger data-testid="tx-frequencia"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIAS.filter((f) => f.value !== "unica").map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="col-span-2 space-y-2">
            <Label>Observações</Label>
            <Textarea data-testid="tx-obs" value={form.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button data-testid="tx-save" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
