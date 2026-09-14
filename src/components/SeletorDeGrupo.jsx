import { GRUPOS, infoDoGrupo } from '../utils/grupos'
import estilos from './SeletorDeGrupo.module.css'

/** Escolha entre Alpha (adolescentes) e Kombo (jovens), já nas cores de cada um. */
export default function SeletorDeGrupo({ valor, aoEscolher, desabilitado }) {
  return (
    <div className={estilos.grade}>
      {GRUPOS.map((grupo) => {
        const info = infoDoGrupo(grupo)
        return (
          <button
            key={grupo}
            type="button"
            data-grupo-cor={grupo}
            className={`${estilos.opcao} ${valor === grupo ? estilos.escolhida : ''}`}
            onClick={() => aoEscolher(grupo)}
            disabled={desabilitado}
          >
            <span className={estilos.sigla}>{info.sigla}</span>
            <span className={estilos.nome}>{info.nome}</span>
            <span className={estilos.publico}>{info.publico}</span>
          </button>
        )
      })}
    </div>
  )
}
