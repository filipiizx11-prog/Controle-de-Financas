import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Pin, PinOff, Search, StickyNote } from "lucide-react";

export default function Notas() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [dlg, setDlg] = useState({ open: false, item: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const load = useCallback(() => { api.get("/notes").then((r) => setRows(r.data)); }, []);
  useEffect(() => { load(); }, [load]);

  const togglePin = async (n) => { await api.put(`/notes/${n.id}`, { ...n, fixada: !n.fixada }); load(); };
  const del = async () => { await api.delete(`/notes/${confirm.id}`); toast.success("Nota excluída."); setConfirm({ open: false, id: null }); load(); };

  const filtered = rows
    .filter((n) => !search || (n.titulo + " " + (n.conteudo || "")).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.fixada ? 1 : 0) - (a.fixada ? 1 : 0));

  return (
    <div>
      <PageHeader title="Bloco de Notas" subtitle="Anotações rápidas do casal.">
        <Button data-testid="add-note-btn" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setDlg({ open: true, item: null })}>
          <Plus className="h-4 w-4 mr-1" /> Nova Nota
        </Button>
      </PageHeader>

      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input data-testid="note-search" placeholder="Pesquisar notas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-14 text-center text-muted-foreground"><StickyNote className="h-10 w-10 mx-auto mb-3 opacity-50" /> Nenhuma nota.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((n) => (
            <Card key={n.id} className={`p-4 ${n.fixada ? "ring-2 ring-amber-500/40" : ""}`} data-testid={`note-${n.id}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium truncate">{n.titulo}</p>
                <button onClick={() => togglePin(n)} className="text-muted-foreground hover:text-amber-500 shrink-0" data-testid={`pin-${n.id}`}>
                  {n.fixada ? <Pin className="h-4 w-4 text-amber-500 fill-amber-500" /> : <PinOff className="h-4 w-4" />}
                </button>
              </div>
              {n.conteudo && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-5">{n.conteudo}</p>}
              <div className="flex justify-end gap-1 mt-3">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDlg({ open: true, item: n })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setConfirm({ open: true, id: n.id })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NoteDialog dlg={dlg} setDlg={setDlg} onSaved={load} />
      <ConfirmDialog open={confirm.open} onOpenChange={(o) => setConfirm({ open: o, id: o ? confirm.id : null })} title="Excluir esta nota?" onConfirm={del} />
    </div>
  );
}

function NoteDialog({ dlg, setDlg, onSaved }) {
  const [f, setF] = useState({});
  useEffect(() => { if (dlg.open) setF(dlg.item || { titulo: "", conteudo: "", fixada: false }); }, [dlg]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.titulo) return toast.error("Informe o título.");
    if (dlg.item?.id) await api.put(`/notes/${dlg.item.id}`, f); else await api.post("/notes", f);
    toast.success("Nota salva.");
    setDlg({ open: false, item: null });
    onSaved();
  };
  return (
    <Dialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o, item: o ? dlg.item : null })}>
      <DialogContent data-testid="note-dialog">
        <DialogHeader><DialogTitle>{dlg.item ? "Editar" : "Nova"} Nota</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Título *</Label><Input data-testid="note-titulo" value={f.titulo || ""} onChange={(e) => set("titulo", e.target.value)} /></div>
          <div className="space-y-2"><Label>Conteúdo</Label><Textarea data-testid="note-conteudo" value={f.conteudo || ""} onChange={(e) => set("conteudo", e.target.value)} rows={6} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDlg({ open: false, item: null })}>Cancelar</Button>
          <Button data-testid="note-save" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
