import estilos from './EstadoVazio.module.css'

/** Mensagem amigável para quando ainda não há nada na lista. */
export default function EstadoVazio({ icone, children }) {
  return (
    <div className={estilos.vazio}>
      <div className={estilos.icone}>{icone}</div>
      {children}
    </div>
  )
}
