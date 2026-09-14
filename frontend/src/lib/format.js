export function brl(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function daysUntil(s) {
  if (!s) return null;
  const d = new Date(s.slice(0, 10) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const RESPONSAVEIS = [
  { value: "eu", label: "Eu" },
  { value: "esposa", label: "Minha Esposa" },
  { value: "ambos", label: "Ambos" },
  { value: "outro", label: "Outro" },
];

export const FREQUENCIAS = [
  { value: "unica", label: "Única" },
  { value: "mensal", label: "Mensal" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "anual", label: "Anual" },
];

export function statusBadge(status) {
  const map = {
    pago: { label: "Pago", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    recebido: { label: "Recebido", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    pendente: { label: "Pendente", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    previsto: { label: "Previsto", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    vencido: { label: "Vencido", cls: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
    atrasado: { label: "Atrasado", cls: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
    cancelado: { label: "Cancelado", cls: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  };
  return map[status] || { label: status, cls: "bg-slate-500/10 text-slate-500 border-slate-500/20" };
}
