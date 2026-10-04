import { SITUACOES } from '../utils/calculos'

/** Situação do vendedor: ativo, meta fechada ou desistiu. */
export default function EtiquetaSituacao({ situacao }) {
  if (!situacao || situacao === 'ativo') return null
  if (situacao === 'quitou') return <span className="tag tag-good">{SITUACOES.quitou}</span>
  if (situacao === 'inscrito') return <span className="tag tag-good">{SITUACOES.inscrito}</span>
  return <span className="tag tag-bad">{SITUACOES.desistiu}</span>
}
