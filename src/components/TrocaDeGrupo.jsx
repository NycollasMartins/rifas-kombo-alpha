import { useSessao } from '../hooks/useSessao'
import { GRUPOS, infoDoGrupo } from '../utils/grupos'
import estilos from './TrocaDeGrupo.module.css'

/**
 * Só para o dev. Ele não pertence a um grupo, então escolhe qual está olhando.
 *
 * A troca vale para tudo: números do painel, lista de vendedores, sorteio,
 * configurações e as cores. É o que impede o painel de somar Alpha com Kombo.
 */
export default function TrocaDeGrupo() {
  const { eDev, grupo, trocarDeGrupo } = useSessao()
  if (!eDev) return null

  return (
    <div className={estilos.barra}>
      <span className={estilos.rotulo}>Olhando</span>
      <div className={estilos.botoes}>
        {GRUPOS.map((g) => (
          <button
            key={g}
            type="button"
            data-grupo-cor={g}
            className={`${estilos.botao} ${grupo === g ? estilos.ativo : ''}`}
            onClick={() => trocarDeGrupo(g)}
          >
            {infoDoGrupo(g).sigla} {infoDoGrupo(g).nome}
          </button>
        ))}
      </div>
    </div>
  )
}
