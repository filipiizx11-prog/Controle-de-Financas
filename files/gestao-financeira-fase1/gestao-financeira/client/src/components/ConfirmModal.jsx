export default function ConfirmModal({ aberto, titulo, mensagem, onConfirmar, onCancelar }) {
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card p-6 max-w-sm w-full">
        <h3 className="font-semibold text-gray-800 mb-2">{titulo}</h3>
        <p className="text-sm text-gray-600 mb-5">{mensagem}</p>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
          <button className="btn-primary !bg-critico hover:!bg-critico-dark" onClick={onConfirmar}>Excluir</button>
        </div>
      </div>
    </div>
  );
}
