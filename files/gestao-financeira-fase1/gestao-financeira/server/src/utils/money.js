// Helper para evitar erros de arredondamento (requisito 27.7).
// Arredonda sempre para 2 casas decimais em centavos, usando aritmetica de inteiros.
function round2(valor) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

function somar(...valores) {
  const centavos = valores.reduce((acc, v) => acc + Math.round(Number(v || 0) * 100), 0);
  return centavos / 100;
}

module.exports = { round2, somar };
