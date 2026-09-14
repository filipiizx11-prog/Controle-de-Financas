import { useEffect, useState } from 'react';
import api from '../services/api';

const PESSOAS = [
  { valor: 'eu', rotulo: 'Eu' },
  { valor: 'esposa', rotulo: 'Minha esposa' },
  { valor: 'ambos', rotulo: 'Ambos' },
  { valor: 'outro', rotulo: 'Outro' },
];

const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Cartão', 'Boleto', 'TED/DOC', 'Outro'];

const vazio = {
  pessoa: 'eu', descricao: '', categoria_id: '', valor: '', data: new Date().toISOString().slice(0, 10),
  vencimento: '', data_prevista: '', forma_pagamento: '', conta_id: '', recorrente: false,
  frequencia: 'mensal', status: '', observacoes: '',
};

export default function TransacaoFormModal({ tipo, aberto, transacao, onFechar, onSalvo }) {
  const [form, setForm] = useState(vazio);
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    api.get('/categorias', { params: { tipo } }).then((r) => setCategorias(r.data));
    api.get('/contas').then((r) => setContas(r.data));
    setErro(null);
    setForm(transacao ? { ...vazio, ...transacao } : { ...vazio, status: tipo === 'entrada' ? 'previsto' : 'pendente' });
  }, [aberto, transacao, tipo]);

  if (!aberto) return null;

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const payload = { ...form, tipo, valor: Number(form.valor) };
      if (transacao) {
        await api.put(`/transacoes/${transacao.id}`, payload);
      } else {
        await api.post('/transacoes', payload);
      }
      onSalvo();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  const statusOpcoes = tipo === 'entrada'
    ? [['previsto', 'Previsto'], ['recebido', 'Recebido'], ['cancelado', 'Cancelado']]
    : [['pendente', 'Pendente'], ['pago', 'Pago'], ['vencido', 'Vencido'], ['cancelado', 'Cancelado']];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <form onSubmit={salvar} className="card w-full max-w-lg p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">
          {transacao ? 'Editar' : 'Nova'} {tipo === 'entrada' ? 'entrada' : 'saída'}
        </h3>

        {erro && <div className="bg-critico-light text-critico-dark text-sm rounded-lg p-2.5">{erro}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">Descrição</label>
            <input className="input mt-1" value={form.descricao} onChange={(e) => atualizar('descricao', e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Valor (R$)</label>
            <input className="input mt-1" type="number" step="0.01" min="0" value={form.valor} onChange={(e) => atualizar('valor', e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Responsável</label>
            <select className="input mt-1" value={form.pessoa} onChange={(e) => atualizar('pessoa', e.target.value)}>
              {PESSOAS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Categoria</label>
            <select className="input mt-1" value={form.categoria_id || ''} onChange={(e) => atualizar('categoria_id', e.target.value)}>
              <option value="">Sem categoria</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Conta / cartão</label>
            <select className="input mt-1" value={form.conta_id || ''} onChange={(e) => atualizar('conta_id', e.target.value)}>
              <option value="">Não informado</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Data</label>
            <input className="input mt-1" type="date" value={form.data} onChange={(e) => atualizar('data', e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">{tipo === 'entrada' ? 'Data prevista' : 'Vencimento'}</label>
            <input
              className="input mt-1"
              type="date"
              value={tipo === 'entrada' ? (form.data_prevista || '') : (form.vencimento || '')}
              onChange={(e) => atualizar(tipo === 'entrada' ? 'data_prevista' : 'vencimento', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Forma de {tipo === 'entrada' ? 'recebimento' : 'pagamento'}</label>
            <select className="input mt-1" value={form.forma_pagamento || ''} onChange={(e) => atualizar('forma_pagamento', e.target.value)}>
              <option value="">Não informado</option>
              {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Status</label>
            <select className="input mt-1" value={form.status} onChange={(e) => atualizar('status', e.target.value)}>
              {statusOpcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
          </div>

          {!transacao && (
            <>
              <div className="flex items-center gap-2 pt-5">
                <input id="recorrente" type="checkbox" checked={form.recorrente} onChange={(e) => atualizar('recorrente', e.target.checked)} />
                <label htmlFor="recorrente" className="text-sm text-gray-700">É recorrente?</label>
              </div>
              {form.recorrente && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Frequência</label>
                  <select className="input mt-1" value={form.frequencia} onChange={(e) => atualizar('frequencia', e.target.value)}>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">Observações</label>
            <textarea className="input mt-1" rows={2} value={form.observacoes || ''} onChange={(e) => atualizar('observacoes', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  );
}
