import estilos from './TelaEntrada.module.css'

/** Primeira tela: entrar como vendedor ou como líder. */
export default function TelaEntrada({ aoEscolherVendedor, aoEscolherLider }) {
  return (
    <>
      <div className={estilos.hero}>
        <div className={estilos.chamaGrande}>🔥</div>
        <h1 className={estilos.titulo}>Rifas do acampamento</h1>
        <p className={estilos.subtitulo}>
          Acompanhe as vendas em tempo real, sem talão e sem planilha de papel.
        </p>
      </div>

      <div className={estilos.grade}>
        <div className={estilos.cartaoPapel} onClick={aoEscolherVendedor}>
          <div className={estilos.icone}>🎟️</div>
          <h3>Sou vendedor(a)</h3>
          <p>Registrar minhas vendas e ver meu progresso</p>
          <button className="btn btn-primary btn-block">Entrar</button>
        </div>

        <div className={estilos.cartaoPapel} onClick={aoEscolherLider}>
          <div className={estilos.icone}>📋</div>
          <h3>Sou líder</h3>
          <p>Ver o painel do meu grupo e gerenciar tudo</p>
          <button className="btn btn-primary btn-block">Entrar</button>
        </div>
      </div>
    </>
  )
}
