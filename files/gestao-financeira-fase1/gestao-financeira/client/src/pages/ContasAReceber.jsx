import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';

const PESSOA_ROTULO = { eu: 'Eu', esposa: 'Minha esposa', ambos: 'Ambos', outro: 'Outro' };

// Requisito 5: Contas a Receber.
export default function ContasAReceber() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [toast, setToast] = useState(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    api.get('/transacoes', { params: { tipo: 'entrada', status: 'previsto', limite: 200 } })
      .then((res) => setItens(res.data.itens))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function marcarRecebida(item) {
    await api.patch(`/transacoes/${item.id}/pagar`);
    setToast('Entrada marcada como recebida.');
    carregar();
  }

  if (carregando) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-left px-4 py-3">Quem irá receber</th>
              <th className="text-left px-4 py-3">Data prevista</th>
              <th className="text-right px-4 py-3">Valor</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {itens.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Nada previsto para receber.</td></tr>
            )}
            {itens.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">{item.descricao}</td>
                <td className="px-4 py-3 text-gray-500">{PESSOA_ROTULO[item.pessoa]}</td>
                <td className="px-4 py-3 text-gray-500">{item.data_prevista?.split('-').reverse().join('/')}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">
                  {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => marcarRecebida(item)} className="text-positivo-dark font-medium text-xs hover:underline">
                    Confirmar recebimento
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Toast mensagem={toast} onClose={() => setToast(null)} />
    </div>
  );
}
