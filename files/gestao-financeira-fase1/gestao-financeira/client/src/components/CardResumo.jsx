export default function CardResumo({ titulo, valor, cor = 'default', sufixo }) {
  const cores = {
    positivo: 'text-positivo-dark',
    critico: 'text-critico-dark',
    atencao: 'text-atencao-dark',
    info: 'text-info-dark',
    default: 'text-gray-800',
  };
  const formatado = typeof valor === 'number'
    ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : valor;

  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-gray-500 mb-1">{titulo}</p>
      <p className={`text-xl font-bold ${cores[cor]}`}>{formatado}{sufixo}</p>
    </div>
  );
}
