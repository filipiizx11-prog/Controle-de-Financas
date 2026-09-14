import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { brl, formatDate, statusBadge, daysUntil, RESPONSAVEIS } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import TransactionDialog from "@/components/TransactionDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Check, Pencil, Trash2, HandCoins } from "lucide-react";

const respLabel = (v) => RESPONSAVEIS.find((r) => r.value === v)?.label || v;

export default function ContasReceber() {
  const { person, refreshKey, refresh } = useApp();
  const [rows, setRows] = useState([]);
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const load = useCallback(() => {
    api.get("/transactions", { params: { tipo: "entrada", person } }).then((r) => {
      setRows(r.data.filter((t) => t.status === "previsto"));
    });
  }, [person]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const receive = async (id) => {
    await api.post(`/transactions/${id}/pay`);
    toast.success("Marcado como recebido.");
    refresh();
  };
  const del = async () => {
    await api.delete(`/transactions/${confirm.id}`);
    toast.success("Excluído com sucesso.");
    setConfirm({ open: false, id: null });
    refresh();
  };

  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);

  return (
    <div>
      <PageHeader title="Contas a Receber" subtitle={`${rows.length} previsto(s) · Total ${brl(total)}`}>
        <Button data-testid="add-receber-btn" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setDialog({ open: true, item: null })}>
          <Plus className="h-4 w-4 mr-1" /> Novo a Receber
        </Button>
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quem irá pagar</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data prevista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-14">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <HandCoins className="h-8 w-8" /> Nenhum valor a receber.
                  </div>
                </TableCell></TableRow>
              ) : rows.map((t) => {
                const dias = daysUntil(t.data_prevista);
                const late = dias != null && dias < 0;
                const sb = statusBadge(late ? "atrasado" : "previsto");
                return (
                  <TableRow key={t.id} data-testid={`receber-${t.id}`} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{respLabel(t.responsavel)}</TableCell>
                    <TableCell>{t.descricao}</TableCell>
                    <TableCell className="text-sm">{formatDate(t.data_prevista)}</TableCell>
                    <TableCell><Badge variant="outline" className={sb.cls}>{sb.label}</Badge></TableCell>
                    <TableCell className="text-right font-mono font-semibold text-emerald-600">{brl(t.valor)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" title="Marcar recebido" data-testid={`receive-${t.id}`} onClick={() => receive(t.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`edit-${t.id}`} onClick={() => setDialog({ open: true, item: t })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" data-testid={`delete-${t.id}`} onClick={() => setConfirm({ open: true, id: t.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <TransactionDialog tipo="entrada" open={dialog.open} item={dialog.item} onOpenChange={(o) => setDialog({ open: o, item: o ? dialog.item : null })} onSaved={load} />
      <ConfirmDialog open={confirm.open} onOpenChange={(o) => setConfirm({ open: o, id: o ? confirm.id : null })} title="Excluir este recebimento?" onConfirm={del} />
    </div>
  );
}
