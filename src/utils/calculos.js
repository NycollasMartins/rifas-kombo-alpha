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
  inscrito: 'Inscrito',
}

export function desistiu(vendedor) {
  return vendedor?.situacao === 'desistiu'
}

/** Vendedor de chalé (só existe no Kombo) usa o preço/meta padrão daquele destino. */
export function ehChale(vendedor) {
  return vendedor?.destino === 'chale'
}

export function precoDoVendedor(vendedor, config) {
  return ehChale(vendedor) ? config.precoRifaChale : config.precoRifa
}

export function metaDoVendedor(vendedor, config) {
  if (!vendedor) return config.metaPadrao
  return vendedor.meta || (ehChale(vendedor) ? config.metaChale : config.metaPadrao)
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
  const preco = precoDoVendedor(vendedor, config)
  const total = totalPago(minhasVendas, preco)
  const meta = metaDoVendedor(vendedor, config)

  return {
    vendedor,
    total,
    pendente: totalPendente(minhasVendas, preco),
    quantidade: minhasVendas.length,
    quantidadePropria: minhasVendas.filter((v) => v.origem === 'propria').length,
    meta,
    faltante: Math.max(0, meta - total),
    percentual: percentualDaMeta(total, meta),
    bateuAMeta: total >= meta,
  }
}

function mapaDeVendedores(vendedores) {
  return new Map(vendedores.map((v) => [v.id, v]))
}

/** Soma vendas de vendedores com preços diferentes (chalé x quarto normal). */
function somarPorPreco(vendas, status, vendedores, config) {
  const mapa = mapaDeVendedores(vendedores)
  return vendas
    .filter((v) => v.status === status)
    .reduce((soma, v) => soma + precoDoVendedor(mapa.get(v.vendedorId), config), 0)
}

export function totalPagoDoGrupo(vendas, vendedores, config) {
  return somarPorPreco(vendas, 'pago', vendedores, config)
}

export function totalPendenteDoGrupo(vendas, vendedores, config) {
  return somarPorPreco(vendas, 'pendente', vendedores, config)
}

/** Números do grupo inteiro, já sem os desistentes. */
export function resumoGeral(vendedores, vendas, config) {
  const naDisputa = vendedoresNaDisputa(vendedores)
  const pago = naDisputa.reduce(
    (soma, v) => soma + totalPago(vendasDoVendedor(vendas, v.id), precoDoVendedor(v, config)),
    0
  )
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

const VALOR_DO_TALAO = 600

/** Vendedores que já arrecadaram mais que um talão (R$600). */
export function rankingPorTalao(vendedores, vendas, config) {
  return vendedoresNaDisputa(vendedores)
    .map((v) => resumoDoVendedor(v, vendas, config))
    .filter((r) => r.total > VALOR_DO_TALAO)
    .sort((a, b) => b.total - a.total)
}

/** Quando o vendedor bateu a própria meta, olhando as vendas pagas em ordem. Null se não bateu ainda. */
function dataDeConclusao(vendedor, vendas, config) {
  const meta = metaDoVendedor(vendedor, config)
  const pagas = vendasDoVendedor(vendas, vendedor.id)
    .filter((v) => v.status === 'pago')
    .sort((a, b) => new Date(a.data) - new Date(b.data))

  const preco = precoDoVendedor(vendedor, config)
  let total = 0
  for (const v of pagas) {
    total += preco
    if (total >= meta) return v.data
  }
  return null
}

/** Vendedores que bateram a meta primeiro, do mais rápido pro mais lento. */
export function rankingDePrimeiros(vendedores, vendas, config) {
  return vendedoresNaDisputa(vendedores)
    .map((v) => ({ vendedor: v, quando: dataDeConclusao(v, vendas, config) }))
    .filter((r) => r.quando)
    .sort((a, b) => new Date(a.quando) - new Date(b.quando))
}

/** Quem ainda não fechou a meta — a lista de cobrança do líder. */
export function quemEstaDevendo(vendedores, vendas, config) {
  return vendedoresNaDisputa(vendedores)
    .map((v) => resumoDoVendedor(v, vendas, config))
    .filter((r) => r.faltante > 0)
    .sort((a, b) => b.faltante - a.faltante)
}
