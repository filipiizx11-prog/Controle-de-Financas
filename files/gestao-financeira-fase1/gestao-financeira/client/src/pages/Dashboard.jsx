import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../services/api';
import CardResumo from '../components/CardResumo';

const SITUACAO_ESTILO = {
  positiva: { cor: 'bg-positivo-light border-positivo text-positivo-dark', icone: '✅' },
  atencao: { cor: 'bg-atencao-light border-atencao text-atencao-dark', icone: '⚠️' },
  critica: { cor: 'bg-critico-light border-critico text-critico-dark', icone: '🚨' },
};

export default function Dashboard() {
  const { periodo } = useOutletContext();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    setCarregando(true);
    api.get('/dashboard', { params: periodo })
      .then((res) => setDados(res.data))
      .catch(() => setErro('Não foi possível carregar o dashboard.'))
      .finally(() => setCarregando(false));
  }, [periodo.mes, periodo.ano]);

  if (carregando) return <p className="text-gray-500">Carregando...</p>;
  if (erro) return <p className="text-critico-dark">{erro}</p>;
  if (!dados) return null;

  const estiloSituacao = SITUACAO_ESTILO[dados.situacao];

  return (
    <div className="space-y-6">
      <div className={`border rounded-xl p-4 flex items-center gap-3 ${estiloSituacao.cor}`}>
        <span className="text-2xl">{estiloSituacao.icone}</span>
        <p className="font-semibold">{dados.mensagemSituacao}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CardResumo titulo="Saldo atual" valor={dados.saldoAtual} />
        <CardResumo titulo="Entradas no mês" valor={dados.totalEntradasMes} cor="positivo" />
        <CardResumo titulo="Saídas no mês" valor={dados.totalSaidasMes} cor="critico" />
        <CardResumo titulo="Contas pagas" valor={dados.totalContasPagas} cor="positivo" />
        <CardResumo titulo="Contas pendentes" valor={dados.totalContasPendentes} cor="atencao" />
        <CardResumo titulo="Contas vencidas" valor={dados.totalContasVencidas} cor="critico" />
        <CardResumo titulo="Total a receber" valor={dados.totalAReceber} cor="info" />
        <CardResumo titulo="Saldo projetado" valor={dados.saldoProjetado} cor={dados.saldoProjetado >= 0 ? 'positivo' : 'critico'} />
        <CardResumo titulo="Disponível para gastos" valor={dados.valorDisponivelParaGastos} cor="info" />
        <CardResumo
          titulo="Renda adicional necessária"
          valor={dados.rendaAdicionalNecessaria}
          cor={dados.rendaAdicionalNecessaria > 0 ? 'critico' : 'default'}
        />
      </div>
    </div>
  );
}
