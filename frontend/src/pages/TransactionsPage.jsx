import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { brl, formatDate, statusBadge, RESPONSAVEIS } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import TransactionDialog from "@/components/TransactionDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Check, Search, Inbox } from "lucide-react";

const respLabel = (v) => RESPONSAVEIS.find((r) => r.value === v)?.label || v;

export default function TransactionsPage({ tipo }) {
  const isEntrada = tipo === "entrada";
  const { month, year, person, refreshKey, refresh } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/transactions", { params: { tipo, person, year, month, search: search || undefined } })
      .then((r) => {
        let data = r.data;
        if (statusFilter !== "all") data = data.filter((t) => t.status_display === statusFilter || t.status === statusFilter);
        setRows(data);
      })
      .finally(() => setLoading(false));
  }, [tipo, person, year, month, search, statusFilter]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const del = async () => {
    await api.delete(`/transactions/${confirm.id}`);
    toast.success("Excluído com sucesso.");
    setConfirm({ open: false, id: null });
    refresh();
  };

  const markPaid = async (id) => {
    await api.post(`/transactions/${id}/pay`);
    toast.success(isEntrada ? "Marcado como recebido." : "Conta marcada como paga.");
    refresh();
  };

  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
  const statusList = isEntrada
    ? [["all", "Todos"], ["previsto", "Previsto"], ["recebido", "Recebido"], ["cancelado", "Cancelado"]]
    : [["all", "Todos"], ["pendente", "Pendente"], ["pago", "Pago"], ["vencido", "Vencido"], ["cancelado", "Cancelado"]];

  return (
    <div>
      <PageHeader
        title={isEntrada ? "Entradas" : "Saídas"}
        subtitle={isEntrada ? "Registre e acompanhe todo o dinheiro que entra." : "Registre e acompanhe todas as despesas."}
      >
        <Button
          data-testid="add-transaction-btn"
          className={isEntrada ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}
          onClick={() => setDialog({ open: true, item: null })}
        >
          <Plus className="h-4 w-4 mr-1" /> {isEntrada ? "Nova Entrada" : "Nova Saída"}
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="search-input" placeholder="Pesquisar descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusList.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className={`ml-auto flex items-center rounded-lg px-4 py-2 text-sm font-semibold ${isEntrada ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`} data-testid="total-badge">
          Total: <span className="font-mono ml-2">{brl(total)}</span>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>{isEntrada ? "Data prevista" : "Vencimento"}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-14">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8" />
                    <span>Nenhum lançamento encontrado neste período.</span>
                  </div>
                </TableCell></TableRow>
              ) : (
                rows.map((r) => {
                  const sb = statusBadge(r.status_display || r.status);
                  const done = ["pago", "recebido"].includes(r.status);
                  return (
                    <TableRow key={r.id} data-testid={`tx-row-${r.id}`} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{r.descricao}</TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{r.categoria}</span></TableCell>
                      <TableCell><span className="text-sm">{respLabel(r.responsavel)}</span></TableCell>
                      <TableCell className="text-sm">{formatDate(isEntrada ? r.data_prevista || r.data : r.vencimento || r.data)}</TableCell>
                      <TableCell><Badge variant="outline" className={sb.cls}>{sb.label}</Badge></TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${isEntrada ? "text-emerald-600" : "text-rose-600"}`}>{brl(r.valor)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {!done && r.status !== "cancelado" && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" title="Marcar como pago/recebido" data-testid={`pay-${r.id}`} onClick={() => markPaid(r.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`edit-${r.id}`} onClick={() => setDialog({ open: true, item: r })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" data-testid={`delete-${r.id}`} onClick={() => setConfirm({ open: true, id: r.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <TransactionDialog tipo={tipo} open={dialog.open} item={dialog.item} onOpenChange={(o) => setDialog({ open: o, item: o ? dialog.item : null })} onSaved={load} />
      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(o) => setConfirm({ open: o, id: o ? confirm.id : null })}
        title={isEntrada ? "Excluir esta entrada?" : "Excluir esta despesa?"}
        onConfirm={del}
      />
    </div>
  );
}
