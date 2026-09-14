import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Toast from '../components/Toast';

// Requisito 4: Contas a Pagar, agrupadas por prazo de vencimento.
function diasRestantes(vencimento) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(vencimento + 'T00:00:00');
  return Math.round((venc - hoje) / 86400000);
}

function grupoDe(dias) {
  if (dias < 0) return 'vencidas';
  if (dias === 0) return 'hoje';
  if (dias <= 7) return 'proximos7';
  if (dias <= 15) return 'proximos15';
  if (dias <= 30) return 'proximos30';
  return 'depois';
}

const GRUPOS = [
  ['vencidas', 'Vencidas', 'border-critico bg-critico-light'],
  ['hoje', 'Hoje', 'border-atencao bg-atencao-light'],
  ['proximos7', 'Próximos 7 dias', 'border-info bg-info-light'],
  ['proximos15', 'Próximos 15 dias', 'border-info bg-info-light'],
  ['proximos30', 'Próximos 30 dias', 'border-gray-200 bg-gray-50'],
  ['depois', 'Depois', 'border-gray-200 bg-gray-50'],
];

const PESSOA_ROTULO = { eu: 'Eu', esposa: 'Minha esposa', ambos: 'Ambos', outro: 'Outro' };

export default function ContasAPagar() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [toast, setToast] = useState(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    api.get('/transacoes', { params: { tipo: 'saida', limite: 200 } })
      .then((res) => setItens(res.data.itens.filter((i) => ['pendente', 'vencido'].includes(i.status))))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function marcarPaga(item) {
    await api.patch(`/transacoes/${item.id}/pagar`);
    setToast('Conta marcada como paga.');
    carregar();
  }

  const agrupado = GRUPOS.reduce((acc, [chave]) => ({ ...acc, [chave]: [] }), {});
  for (const item of itens) {
    const dias = diasRestantes(item.vencimento);
    agrupado[grupoDe(dias)].push({ ...item, dias });
  }

  if (carregando) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      {GRUPOS.map(([chave, titulo, estilo]) => (
        agrupado[chave].length > 0 && (
          <div key={chave}>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">{titulo} ({agrupado[chave].length})</h3>
            <div className="space-y-2">
              {agrupado[chave].map((item) => (
                <div key={item.id} className={`border-l-4 ${estilo} rounded-lg p-3 flex items-center justify-between`}>
                  <div>
                    <p className="font-medium text-gray-800">{item.descricao}</p>
                    <p className="text-xs text-gray-500">
                      {PESSOA_ROTULO[item.pessoa]} · Vence em {item.vencimento.split('-').reverse().join('/')}
                      {item.dias < 0 ? ` · ${Math.abs(item.dias)} dia(s) em atraso` : item.dias === 0 ? ' · vence hoje' : ` · em ${item.dias} dia(s)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700">
                      {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <button onClick={() => marcarPaga(item)} className="btn-secondary !bg-positivo-light text-positivo-dark text-xs">
                      Marcar como paga
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
      {itens.length === 0 && <p className="text-gray-400">Nenhuma conta pendente. 🎉</p>}
      <Toast mensagem={toast} onClose={() => setToast(null)} />
    </div>
  );
}
