/**
 * Contas do prazo final de vendas.
 *
 * A regra do acampamento: todo vendedor assina um termo se comprometendo a
 * comprar as rifas que não conseguir vender até a data limite.
 */

/** Dias até a data (negativo se já passou). Null se não houver prazo. */
export function diasAte(dataIso) {
  if (!dataIso) return null

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // '2026-09-30' interpretado como data local, não UTC — senão o prazo
  // "vira" um dia antes para quem está no Brasil.
  const [ano, mes, dia] = String(dataIso).split('-').map(Number)
  const limite = new Date(ano, mes - 1, dia)
  limite.setHours(0, 0, 0, 0)

  return Math.round((limite - hoje) / 86400000)
}

export function prazoEncerrado(dataIso) {
  const dias = diasAte(dataIso)
  return dias !== null && dias < 0
}

export function formatarPrazo(dataIso) {
  if (!dataIso) return ''
  const [ano, mes, dia] = String(dataIso).split('-')
  return `${dia}/${mes}/${ano}`
}

/** Quanto ainda falta em dinheiro para o vendedor bater a meta. */
export function faltanteParaMeta(arrecadadoPago, meta) {
  return Math.max(0, meta - arrecadadoPago)
}

/** Quantas rifas ele precisa comprar para cobrir esse faltante. */
export function rifasParaFecharMeta(faltante, precoRifa) {
  if (!precoRifa || precoRifa <= 0) return 0
  return Math.ceil(faltante / precoRifa)
}

/** Frase pronta para a tela do vendedor. */
export function recadoDoPrazo(dataIso) {
  const dias = diasAte(dataIso)
  if (dias === null) return ''
  if (dias < 0) return 'O prazo de vendas encerrou'
  if (dias === 0) return 'Hoje é o último dia de vendas'
  if (dias === 1) return 'Falta 1 dia para o fim das vendas'
  return `Faltam ${dias} dias para o fim das vendas`
}

/**
 * Os avisos combinados: 7 dias, 3 dias, 24 horas, o dia do encerramento e
 * depois dele. Devolve sempre o mais apertado que já foi atingido, para que
 * quem abre o app no quinto dia veja o aviso de 7 e não fique sem nada.
 */
export const MARCOS = ['sete', 'tres', 'um', 'hoje', 'encerrado']

export function marcoDoPrazo(dataIso) {
  const dias = diasAte(dataIso)
  if (dias === null) return null
  if (dias < 0) return 'encerrado'
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'um'
  if (dias <= 3) return 'tres'
  if (dias <= 7) return 'sete'
  return null
}

/** O dia do prazo e o que já passou não se fecham: são importantes demais. */
export function marcoPodeSerDispensado(marco) {
  return marco === 'sete' || marco === 'tres' || marco === 'um'
}

export function gravidadeDoMarco(marco) {
  if (marco === 'encerrado' || marco === 'hoje') return 'urgente'
  if (marco === 'um' || marco === 'tres') return 'atencao'
  return 'aviso'
}

/** Título e explicação de cada aviso, do ponto de vista do vendedor. */
export function textoDoAviso(marco, { rifasQueFaltam, valorQueFalta, dataFormatada }) {
  const quanto = `${rifasQueFaltam} rifa${rifasQueFaltam === 1 ? '' : 's'} (${valorQueFalta})`

  if (marco === 'encerrado') {
    return {
      titulo: 'O prazo de vendas encerrou',
      texto: `Pelo termo que você assinou, agora é preciso comprar ${quanto} para fechar sua meta. Procure a liderança.`,
    }
  }
  if (marco === 'hoje') {
    return {
      titulo: 'Hoje é o último dia de vendas',
      texto: `Faltam ${quanto} para você bater a meta. O que não for vendido hoje, você compra.`,
    }
  }
  if (marco === 'um') {
    return {
      titulo: 'Falta 1 dia para o prazo acabar',
      texto: `Ainda faltam ${quanto}. Amanhã (${dataFormatada}) é o último dia.`,
    }
  }
  if (marco === 'tres') {
    return {
      titulo: 'Faltam 3 dias para o prazo',
      texto: `Ainda faltam ${quanto} até ${dataFormatada}.`,
    }
  }
  return {
    titulo: 'Falta 1 semana para o prazo',
    texto: `Ainda faltam ${quanto} até ${dataFormatada}. Dá tempo, mas comece a correr atrás.`,
  }
}
