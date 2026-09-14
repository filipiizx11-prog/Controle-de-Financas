import { useAuth } from '../context/AuthContext';

export default function Topbar({ mes, ano, onMudarPeriodo }) {
  const { usuario, logout } = useAuth();
  const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {onMudarPeriodo && (
          <>
            <select
              className="input !w-auto text-sm"
              value={mes}
              onChange={(e) => onMudarPeriodo(Number(e.target.value), ano)}
            >
              {nomesMeses.map((nome, i) => (
                <option key={nome} value={i + 1}>{nome}</option>
              ))}
            </select>
            <select
              className="input !w-auto text-sm"
              value={ano}
              onChange={(e) => onMudarPeriodo(mes, Number(e.target.value))}
            >
              {[ano - 1, ano, ano + 1].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">Olá, <strong>{usuario?.nome}</strong></span>
        <button onClick={logout} className="btn-secondary text-sm">Sair</button>
      </div>
    </header>
  );
}
