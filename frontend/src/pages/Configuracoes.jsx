import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, X, Save } from "lucide-react";

export default function Configuracoes() {
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState({ nome: "", tipo: "saida", limite_mensal: "" });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const loadCats = useCallback(() => api.get("/categories").then((r) => setCategories(r.data)), []);
  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data));
    loadCats();
  }, [loadCats]);

  const saveSettings = async () => {
    const { id, key, ...payload } = settings;
    await api.put("/settings", payload);
    toast.success("Configurações salvas.");
  };

  const addListItem = (field) => setSettings((s) => ({ ...s, [field]: [...(s[field] || []), ""] }));
  const setListItem = (field, i, v) => setSettings((s) => { const arr = [...s[field]]; arr[i] = v; return { ...s, [field]: arr }; });
  const removeListItem = (field, i) => setSettings((s) => ({ ...s, [field]: s[field].filter((_, j) => j !== i) }));

  const addCat = async () => {
    if (!newCat.nome) return toast.error("Informe o nome.");
    await api.post("/categories", { ...newCat, limite_mensal: Number(newCat.limite_mensal || 0) });
    setNewCat({ nome: "", tipo: "saida", limite_mensal: "" });
    toast.success("Categoria criada.");
    loadCats();
  };
  const updateCatLimit = async (c, limite) => {
    await api.put(`/categories/${c.id}`, { nome: c.nome, tipo: c.tipo, limite_mensal: Number(limite || 0) });
    loadCats();
  };
  const delCat = async () => {
    await api.delete(`/categories/${confirm.id}`);
    toast.success("Categoria excluída.");
    setConfirm({ open: false, id: null });
    loadCats();
  };

  if (!settings) return <div className="text-muted-foreground">Carregando...</div>;

  const ListEditor = ({ label, field }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{label}</Label>
        <Button size="sm" variant="ghost" onClick={() => addListItem(field)} data-testid={`add-${field}`}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
      </div>
      <div className="space-y-2">
        {(settings[field] || []).map((v, i) => (
          <div key={i} className="flex gap-2">
            <Input value={v} onChange={(e) => setListItem(field, i, e.target.value)} />
            <Button size="icon" variant="ghost" className="text-rose-600 shrink-0" onClick={() => removeListItem(field, i)}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        {(settings[field] || []).length === 0 && <p className="text-xs text-muted-foreground">Nenhum item.</p>}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Personalize o sistema para o casal." />

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral" data-testid="tab-geral">Geral</TabsTrigger>
          <TabsTrigger value="contas" data-testid="tab-contas">Contas & Pagamentos</TabsTrigger>
          <TabsTrigger value="categorias" data-testid="tab-categorias">Categorias & Orçamento</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          <Card className="p-6 max-w-2xl space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome (você)</Label><Input data-testid="nome1" value={settings.nome_usuario1 || ""} onChange={(e) => setSettings({ ...settings, nome_usuario1: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nome (cônjuge)</Label><Input data-testid="nome2" value={settings.nome_usuario2 || ""} onChange={(e) => setSettings({ ...settings, nome_usuario2: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={settings.moeda} onValueChange={(v) => setSettings({ ...settings, moeda: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="BRL">Real (R$)</SelectItem><SelectItem value="USD">Dólar (US$)</SelectItem><SelectItem value="EUR">Euro (€)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Primeiro dia do mês financeiro</Label><Input type="number" min="1" max="28" value={settings.primeiro_dia_mes || 1} onChange={(e) => setSettings({ ...settings, primeiro_dia_mes: Number(e.target.value) })} /></div>
            </div>
            <Button data-testid="save-settings" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={saveSettings}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </Card>
        </TabsContent>

        <TabsContent value="contas" className="mt-4">
          <Card className="p-6 max-w-2xl space-y-6">
            <ListEditor label="Contas Bancárias" field="contas" />
            <ListEditor label="Cartões" field="cartoes" />
            <ListEditor label="Formas de Pagamento" field="formas_pagamento" />
            <Button data-testid="save-settings-2" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={saveSettings}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="mt-4">
          <Card className="p-6 mb-4">
            <h3 className="font-heading font-semibold mb-3">Nova Categoria</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="Nome" value={newCat.nome} onChange={(e) => setNewCat({ ...newCat, nome: e.target.value })} data-testid="new-cat-nome" className="flex-1" />
              <Select value={newCat.tipo} onValueChange={(v) => setNewCat({ ...newCat, tipo: v })}>
                <SelectTrigger className="w-[140px]" data-testid="new-cat-tipo"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="saida">Saída</SelectItem><SelectItem value="entrada">Entrada</SelectItem></SelectContent>
              </Select>
              <Input type="number" placeholder="Limite (R$)" value={newCat.limite_mensal} onChange={(e) => setNewCat({ ...newCat, limite_mensal: e.target.value })} className="w-[140px]" />
              <Button data-testid="add-cat-btn" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={addCat}><Plus className="h-4 w-4 mr-1" /> Criar</Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-heading font-semibold mb-3">Saídas <Badge variant="outline" className="ml-1">Orçamento mensal</Badge></h3>
              {categories.filter((c) => c.tipo === "saida").map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0" data-testid={`cat-${c.id}`}>
                  <span className="text-sm flex-1">{c.nome}</span>
                  <Input type="number" defaultValue={c.limite_mensal || ""} placeholder="0" className="w-28 h-8" onBlur={(e) => updateCatLimit(c, e.target.value)} data-testid={`limit-${c.id}`} />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setConfirm({ open: true, id: c.id })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </Card>
            <Card className="p-5">
              <h3 className="font-heading font-semibold mb-3">Entradas</h3>
              {categories.filter((c) => c.tipo === "entrada").map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0" data-testid={`cat-${c.id}`}>
                  <span className="text-sm flex-1">{c.nome}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setConfirm({ open: true, id: c.id })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog open={confirm.open} onOpenChange={(o) => setConfirm({ open: o, id: o ? confirm.id : null })} title="Excluir esta categoria?" onConfirm={delCat} />
    </div>
  );
}
