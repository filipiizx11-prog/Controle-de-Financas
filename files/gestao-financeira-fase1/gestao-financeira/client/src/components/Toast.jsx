export default function Toast({ mensagem, tipo = 'sucesso', onClose }) {
  if (!mensagem) return null;
  const cores = tipo === 'erro' ? 'bg-critico text-white' : 'bg-positivo text-white';
  return (
    <div className={`fixed bottom-6 right-6 ${cores} px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50`}>
      <div className="flex items-center gap-3">
        {mensagem}
        <button onClick={onClose} className="opacity-70 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}
