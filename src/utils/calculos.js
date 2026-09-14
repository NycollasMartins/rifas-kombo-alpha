/**
 * Todas as contas do app. Funções puras: recebem os dados, devolvem números.
 *
 * Uma regra atravessa quase tudo aqui: quem DESISTIU do acampamento sai das
 * contas de meta — não tem mais vaga para pagar — mas o dinheiro que já
 * arrecadou continua no caixa, agora destinado à igreja.
 */

export const SITUACOES = {
  ativo: 'Ativo',
  quitou: 'Meta fechada',
  desistiu: 'Desistiu',
}

export function desistiu(vendedor) {
  return vendedor?.situacao === 'desistiu'
}

export function metaDoVendedor(vendedor, config) {
  if (!vendedor) return config.metaPadrao
  return vendedor.meta || config.metaPadrao
}

export function vendasDoVendedor(vendas, vendedorId) {
  return vendas.filter((v) => v.vendedorId === vendedorId)
}

export function totalPago(vendas, precoRifa) {
  return vendas.filter((v) => v.status === 'pago').length * precoRifa
}

export function totalPendente(vendas, precoRifa) {
  return vendas.filter((v) => v.status === 'pendente').length * precoRifa
}

export function percentualDaMeta(total, meta) {
  if (!meta || meta <= 0) return 0
  return Math.min(100, Math.round((total / meta) * 100))
}

/** Vendedores que ainda ocupam uma vaga (todos menos os que desistiram). */
export function vendedoresNaDisputa(vendedores) {
  return vendedores.filter((v) => !desistiu(v))
}

/** Separa as vendas entre as que pagam vagas e as que ficaram para a igreja. */
export function separarPorDestino(vendedores, vendas) {
  const desistentes = new Set(vendedores.filter(desistiu).map((v) => v.id))
  return {
    deVagas: vendas.filter((s) => !desistentes.has(s.vendedorId)),
    daIgreja: vendas.filter((s) => desistentes.has(s.vendedorId)),
  }
}

/** Ranking dos vendedores que continuam na disputa. */
export function montarRanking(vendedores, vendas, config) {
  return vendedoresNaDisputa(vendedores)
    .map((vendedor) => resumoDoVendedor(vendedor, vendas, config))
    .sort((a, b) => b.total - a.total)
}

/** Tudo que se sabe sobre um vendedor, em números. */
export function resumoDoVendedor(vendedor, vendas, config) {
  const minhasVendas = vendasDoVendedor(vendas, vendedor.id)
  const total = totalPago(minhasVendas, config.precoRifa)
  const meta = metaDoVendedor(vendedor, config)

  return {
    vendedor,
    total,
    pendente: totalPendente(minhasVendas, config.precoRifa),
    quantidade: minhasVendas.length,
    quantidadePropria: minhasVendas.filter((v) => v.origem === 'propria').length,
    meta,
    faltante: Math.max(0, meta - total),
    percentual: percentualDaMeta(total, meta),
    bateuAMeta: total >= meta,
  }
}

/** Números do grupo inteiro, já sem os desistentes. */
export function resumoGeral(vendedores, vendas, config) {
  const naDisputa = vendedoresNaDisputa(vendedores)
  const ids = new Set(naDisputa.map((v) => v.id))
  const doGrupo = vendas.filter((s) => ids.has(s.vendedorId))
  const pago = totalPago(doGrupo, config.precoRifa)
  const meta = naDisputa.reduce((soma, v) => soma + metaDoVendedor(v, config), 0)

  return {
    quantidadeVendedores: naDisputa.length,
    pago,
    meta,
    percentual: percentualDaMeta(pago, meta),
  }
}

export function metaGeral(vendedores, config) {
  return vendedoresNaDisputa(vendedores).reduce(
    (soma, v) => soma + metaDoVendedor(v, config),
    0
  )
}

/** Quem ainda não fechou a meta — a lista de cobrança do líder. */
export function quemEstaDevendo(vendedores, vendas, config) {
  return vendedoresNaDisputa(vendedores)
    .map((v) => resumoDoVendedor(v, vendas, config))
    .filter((r) => r.faltante > 0)
    .sort((a, b) => b.faltante - a.faltante)
}
