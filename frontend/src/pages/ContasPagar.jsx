import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { brl, formatDate, daysUntil, RESPONSAVEIS } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import TransactionDialog from "@/components/TransactionDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, Pencil, Trash2, CalendarClock } from "lucide-react";

const respLabel = (v) => RESPONSAVEIS.find((r) => r.value === v)?.label || v;

const BUCKETS = [
  { key: "atrasadas", label: "Atrasadas", test: (d) => d < 0, color: "rose" },
  { key: "hoje", label: "Vencem Hoje", test: (d) => d === 0, color: "amber" },
  { key: "7", label: "Próximos 7 dias", test: (d) => d > 0 && d <= 7, color: "amber" },
  { key: "15", label: "Próximos 15 dias", test: (d) => d > 7 && d <= 15, color: "blue" },
  { key: "30", label: "Próximos 30 dias", test: (d) => d > 15 && d <= 30, color: "blue" },
  { key: "depois", label: "Depois", test: (d) => d > 30, color: "slate" },
];

const DOT = { rose: "bg-rose-500", amber: "bg-amber-500", blue: "bg-blue-500", slate: "bg-slate-400" };

export default function ContasPagar() {
  const { person, refreshKey, refresh } = useApp();
  const [rows, setRows] = useState([]);
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const load = useCallback(() => {
    api.get("/transactions", { params: { tipo: "saida", person } }).then((r) => {
      setRows(r.data.filter((t) => t.status === "pendente"));
    });
  }, [person]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const markPaid = async (id) => {
    await api.post(`/transactions/${id}/pay`);
    toast.success("Conta marcada como paga.");
    refresh();
  };
  const del = async () => {
    await api.delete(`/transactions/${confirm.id}`);
    toast.success("Excluído com sucesso.");
    setConfirm({ open: false, id: null });
    refresh();
  };

  const grouped = BUCKETS.map((b) => ({
    ...b,
    items: rows.filter((t) => t.vencimento && b.test(daysUntil(t.vencimento))),
  })).filter((b) => b.items.length > 0);

  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);

  return (
    <div>
      <PageHeader title="Contas a Pagar" subtitle={`${rows.length} conta(s) pendente(s) · Total ${brl(total)}`}>
        <Button data-testid="add-conta-btn" className="bg-rose-500 hover:bg-rose-600 text-white" onClick={() => setDialog({ open: true, item: null })}>
          <Plus className="h-4 w-4 mr-1" /> Nova Conta
        </Button>
      </PageHeader>

      {grouped.length === 0 ? (
        <Card className="p-14 text-center text-muted-foreground">
          <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-50" />
          Nenhuma conta pendente. Tudo em dia! 🎉
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((b) => {
            const subtotal = b.items.reduce((s, r) => s + Number(r.valor || 0), 0);
            return (
              <div key={b.key} data-testid={`bucket-${b.key}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${DOT[b.color]}`} />
                  <h3 className="font-heading font-semibold">{b.label}</h3>
                  <Badge variant="outline" className="ml-1">{b.items.length}</Badge>
                  <span className="ml-auto font-mono text-sm font-semibold text-rose-600">{brl(subtotal)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {b.items.map((t) => {
                    const dias = daysUntil(t.vencimento);
                    return (
                      <Card key={t.id} className="p-4" data-testid={`conta-${t.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{t.descricao}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.categoria} · {respLabel(t.responsavel)}</p>
                          </div>
                          <span className="font-mono font-bold text-rose-600 shrink-0">{brl(t.valor)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">
                            Vence {formatDate(t.vencimento)} · {dias < 0 ? `${Math.abs(dias)}d atrasada` : dias === 0 ? "hoje" : `em ${dias}d`}
                          </span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" title="Marcar como paga" data-testid={`pay-${t.id}`} onClick={() => markPaid(t.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`edit-${t.id}`} onClick={() => setDialog({ open: true, item: t })}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" data-testid={`delete-${t.id}`} onClick={() => setConfirm({ open: true, id: t.id })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TransactionDialog tipo="saida" open={dialog.open} item={dialog.item} onOpenChange={(o) => setDialog({ open: o, item: o ? dialog.item : null })} onSaved={load} />
      <ConfirmDialog open={confirm.open} onOpenChange={(o) => setConfirm({ open: o, id: o ? confirm.id : null })} title="Excluir esta conta?" onConfirm={del} />
    </div>
  );
}
