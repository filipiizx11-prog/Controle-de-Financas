const ESTILOS = {
  previsto: 'bg-info-light text-info-dark',
  recebido: 'bg-positivo-light text-positivo-dark',
  pendente: 'bg-atencao-light text-atencao-dark',
  pago: 'bg-positivo-light text-positivo-dark',
  vencido: 'bg-critico-light text-critico-dark',
  cancelado: 'bg-gray-100 text-gray-500',
};

const ROTULOS = {
  previsto: 'Previsto', recebido: 'Recebido', pendente: 'Pendente',
  pago: 'Pago', vencido: 'Vencido', cancelado: 'Cancelado',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${ESTILOS[status] || 'bg-gray-100 text-gray-500'}`}>
      {ROTULOS[status] || status}
    </span>
  );
}
