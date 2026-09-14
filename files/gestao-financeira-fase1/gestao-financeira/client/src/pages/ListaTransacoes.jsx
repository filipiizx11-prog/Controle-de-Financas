import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import TransacaoFormModal from '../components/TransacaoFormModal';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

const PESSOA_ROTULO = { eu: 'Eu', esposa: 'Minha esposa', ambos: 'Ambos', outro: 'Outro' };

// Pagina generica de listagem, usada tanto para Entradas quanto para Saidas
// (requisitos 2 e 3), com filtros, busca, edicao, exclusao e confirmacao de pagamento.
export default function ListaTransacoes({ tipo }) {
  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState({ status: '', pessoa: '', busca: '' });
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [toast, setToast] = useState(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    const params = { tipo, limite: 100 };
    if (filtros.status) params.status = filtros.status;
    if (filtros.pessoa) params.pessoa = filtros.pessoa;
    if (filtros.busca) params.busca = filtros.busca;
    api.get('/transacoes', { params })
      .then((res) => { setItens(res.data.itens); setTotal(res.data.total); })
      .finally(() => setCarregando(false));
  }, [tipo, filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  async function marcarComoConfirmado(item) {
    await api.patch(`/transacoes/${item.id}/pagar`);
    setToast(tipo === 'entrada' ? 'Entrada marcada como recebida.' : 'Conta marcada como paga.');
    carregar();
  }

  async function confirmarExclusao() {
    await api.delete(`/transacoes/${excluindo.id}`);
    setExcluindo(null);
    setToast('Excluído com sucesso.');
    carregar();
  }

  const statusOpcoes = tipo === 'entrada'
    ? [['', 'Todos'], ['previsto', 'Previsto'], ['recebido', 'Recebido'], ['cancelado', 'Cancelado']]
    : [['', 'Todos'], ['pendente', 'Pendente'], ['pago', 'Pago'], ['vencido', 'Vencido'], ['cancelado', 'Cancelado']];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            className="input !w-56"
            placeholder="Pesquisar..."
            value={filtros.busca}
            onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
          />
          <select className="input !w-auto" value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}>
            {statusOpcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
          <select className="input !w-auto" value={filtros.pessoa} onChange={(e) => setFiltros((f) => ({ ...f, pessoa: e.target.value }))}>
            <option value="">Todas as pessoas</option>
            {Object.entries(PESSOA_ROTULO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => { setEditando(null); setModalAberto(true); }}>
          + Nova {tipo === 'entrada' ? 'entrada' : 'saída'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-left px-4 py-3">Categoria</th>
              <th className="text-left px-4 py-3">Responsável</th>
              <th className="text-left px-4 py-3">{tipo === 'entrada' ? 'Previsto' : 'Vencimento'}</th>
              <th className="text-right px-4 py-3">Valor</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {carregando && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Carregando...</td></tr>
            )}
            {!carregando && itens.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
            )}
            {itens.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700">{item.descricao}</td>
                <td className="px-4 py-3 text-gray-500">{item.categoria_nome || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{PESSOA_ROTULO[item.pessoa]}</td>
                <td className="px-4 py-3 text-gray-500">
                  {(tipo === 'entrada' ? item.data_prevista : item.vencimento)?.split('-').reverse().join('/')}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">
                  {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {(item.status === 'previsto' || item.status === 'pendente' || item.status === 'vencido') && (
                    <button onClick={() => marcarComoConfirmado(item)} className="text-positivo-dark font-medium text-xs mr-3 hover:underline">
                      {tipo === 'entrada' ? 'Confirmar recebimento' : 'Marcar como paga'}
                    </button>
                  )}
                  <button onClick={() => { setEditando(item); setModalAberto(true); }} className="text-info-dark font-medium text-xs mr-3 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => setExcluindo(item)} className="text-critico-dark font-medium text-xs hover:underline">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > itens.length && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t">Mostrando {itens.length} de {total} registros.</div>
        )}
      </div>

      <TransacaoFormModal
        tipo={tipo}
        aberto={modalAberto}
        transacao={editando}
        onFechar={() => setModalAberto(false)}
        onSalvo={() => { setModalAberto(false); setToast('Salvo com sucesso.'); carregar(); }}
      />
      <ConfirmModal
        aberto={!!excluindo}
        titulo="Excluir registro"
        mensagem={`Tem certeza que deseja excluir "${excluindo?.descricao}"?`}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setExcluindo(null)}
      />
      <Toast mensagem={toast} onClose={() => setToast(null)} />
    </div>
  );
}
