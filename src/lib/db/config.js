import { supabase } from '../supabase'
import { verificar } from './erros'

/** Ajustes do acampamento. Cada grupo tem os seus. */

export const CONFIG_PADRAO = {
  precoRifa: 10,
  metaPadrao: 500,
  precoRifaChale: 10,
  metaChale: 500,
  prazoFinal: '',
  premio: '',
  dataSorteio: '',
  primeiroAcerto: '',
}

export function mapearConfig(linha) {
  if (!linha) return { ...CONFIG_PADRAO }
  return {
    grupo: linha.grupo,
    precoRifa: Number(linha.preco_rifa) || 0,
    metaPadrao: Number(linha.meta_padrao) || 0,
    precoRifaChale: Number(linha.preco_rifa_chale) || 0,
    metaChale: Number(linha.meta_chale) || 0,
    prazoFinal: linha.prazo_final || '',
    premio: linha.premio || '',
    dataSorteio: linha.data_sorteio || '',
    primeiroAcerto: linha.primeiro_acerto || '',
  }
}

/**
 * O banco devolve só o que a pessoa pode ver: uma linha para líder e vendedor,
 * as duas para o dev. Por isso vem indexado por grupo.
 */
export async function listarConfigs() {
  const linhas = verificar(
    await supabase.from('config').select('*'),
    'Não foi possível carregar as configurações.'
  )
  const porGrupo = {}
  linhas.forEach((linha) => {
    porGrupo[linha.grupo] = mapearConfig(linha)
  })
  return porGrupo
}

export async function salvarConfig(grupo, mudancas) {
  const linha = { updated_at: new Date().toISOString() }
  if (mudancas.precoRifa !== undefined) linha.preco_rifa = mudancas.precoRifa
  if (mudancas.metaPadrao !== undefined) linha.meta_padrao = mudancas.metaPadrao
  if (mudancas.precoRifaChale !== undefined) linha.preco_rifa_chale = mudancas.precoRifaChale
  if (mudancas.metaChale !== undefined) linha.meta_chale = mudancas.metaChale
  if (mudancas.prazoFinal !== undefined) linha.prazo_final = mudancas.prazoFinal || null
  if (mudancas.premio !== undefined) linha.premio = mudancas.premio || null
  if (mudancas.dataSorteio !== undefined) linha.data_sorteio = mudancas.dataSorteio || null
  if (mudancas.primeiroAcerto !== undefined) linha.primeiro_acerto = mudancas.primeiroAcerto || null

  const salva = verificar(
    await supabase.from('config').update(linha).eq('grupo', grupo).select().single(),
    'Não foi possível salvar as configurações.'
  )
  return mapearConfig(salva)
}
