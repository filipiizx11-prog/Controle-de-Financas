import { NavLink } from 'react-router-dom';

const itens = [
  { to: '/', label: 'Dashboard', icone: '📊' },
  { to: '/entradas', label: 'Entradas', icone: '💰' },
  { to: '/saidas', label: 'Saídas', icone: '💸' },
  { to: '/contas-a-pagar', label: 'Contas a Pagar', icone: '🧾' },
  { to: '/contas-a-receber', label: 'Contas a Receber', icone: '📥' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-marca-900 text-white min-h-screen flex flex-col">
      <div className="px-5 py-6">
        <h1 className="text-lg font-bold leading-tight">Gestão Financeira</h1>
        <p className="text-xs text-white/50 mt-0.5">Familiar</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-marca-500 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span>{item.icone}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 text-[11px] text-white/40">
        Fase 1 — módulos futuros: gráficos, planejamento, tarefas, notas, lembretes, calendário, metas.
      </div>
    </aside>
  );
}
