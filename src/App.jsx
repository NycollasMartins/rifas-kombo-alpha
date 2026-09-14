import { useState } from 'react'
import TelaEntrada from './components/TelaEntrada'
import TelaLider from './components/TelaLider'
import TelaVendedorEntrada from './components/TelaVendedorEntrada'
import TelaVendedor from './components/TelaVendedor'
import TelaNovaSenha from './components/TelaNovaSenha'
import TelaSemAcesso from './components/TelaSemAcesso'
import PainelLider from './components/PainelLider'
import ConviteParaInstalar from './components/ConviteParaInstalar'
import { useSessao } from './hooks/useSessao'
import { useDadosRifa } from './hooks/useDadosRifa'

/**
 * Decide qual tela mostrar.
 *
 * Depois do login, quem manda é o papel que veio do banco — não a porta pela
 * qual a pessoa entrou. Alguém que clicou em "Sou vendedor" mas tem conta de
 * líder cai no painel de líder do mesmo jeito.
 */
export default function App() {
  const { temAcesso, papel, eLider, eVendedor, estaLogado, verificando, recuperandoSenha } =
    useSessao()
  const { carregando, erroCarregamento, recarregar } = useDadosRifa()

  const [porta, setPorta] = useState('entrada') // entrada | lider | vendedor

  // O convite de instalação acompanha qualquer tela, inclusive a de entrada —
  // é onde a maioria chega pela primeira vez.
  const tela = escolherTela()

  return (
    <>
      {tela}
      <ConviteParaInstalar />
    </>
  )

  function escolherTela() {
  if (recuperandoSenha) return <TelaNovaSenha />

  if (verificando) return <div className="loading-wrap">Carregando…</div>

  // Entrou, mas a conta ainda não está ligada a nenhum cadastro.
  if (estaLogado && !temAcesso && papel === 'sem_acesso') return <TelaSemAcesso />

  if (temAcesso) {
    if (carregando) return <div className="loading-wrap">Carregando…</div>

    if (erroCarregamento) {
      return (
        <div className="card" style={{ marginTop: 40 }}>
          <h2>Não deu para carregar</h2>
          <p className="texto-ajuda">{erroCarregamento}</p>
          <button className="btn btn-primary" onClick={() => recarregar()}>
            Tentar de novo
          </button>
        </div>
      )
    }

    if (eLider) return <PainelLider />
    if (eVendedor) return <TelaVendedor />
  }

  if (porta === 'lider') return <TelaLider aoVoltar={() => setPorta('entrada')} />
  if (porta === 'vendedor') return <TelaVendedorEntrada aoVoltar={() => setPorta('entrada')} />

  return (
    <TelaEntrada
      aoEscolherVendedor={() => setPorta('vendedor')}
      aoEscolherLider={() => setPorta('lider')}
    />
  )
  }
}
