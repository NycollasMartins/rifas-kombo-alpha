import { infoDoGrupo } from '../utils/grupos'
import estilos from './Topbar.module.css'

/** Cabeçalho das telas internas, já com a identidade do grupo. */
export default function Topbar({ grupo, titulo, subtitulo, aoSair }) {
  const info = infoDoGrupo(grupo)
  return (
    <div className={estilos.topbar}>
      <div className={estilos.marca}>
        <div className={estilos.selo}>{info.sigla || '🔥'}</div>
        <div className={estilos.textos}>
          <h1 className={estilos.titulo}>{titulo}</h1>
          {subtitulo && <div className={estilos.subtitulo}>{subtitulo}</div>}
        </div>
      </div>
      <button className="btn-ghost" onClick={aoSair}>
        Sair
      </button>
    </div>
  )
}
