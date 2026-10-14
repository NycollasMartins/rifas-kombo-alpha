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
  const {
    temAcesso,
    papel,
    eLider,
    eVendedor,
    estaLogado,
    verificando,
    processando,
    recuperandoSenha,
    papelDesejado,
    escolherPorta,
  } = useSessao()
  const { carregando, erroCarregamento, recarregar } = useDadosRifa()

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

  // Entrou, mas a conta ainda não está ligada a nenhum cadastro. Enquanto um
  // cadastro/vínculo estiver em andamento, mostra "Carregando…" em vez de
  // "sem acesso" — senão a tela pisca errado antes do processo terminar.
  if (estaLogado && !temAcesso && papel === 'sem_acesso') {
    if (processando) return <div className="loading-wrap">Carregando…</div>
    return <TelaSemAcesso />
  }

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

  if (papelDesejado === 'lider') return <TelaLider aoVoltar={() => escolherPorta(null)} />
  if (papelDesejado === 'vendedor')
    return <TelaVendedorEntrada aoVoltar={() => escolherPorta(null)} />

  return (
    <TelaEntrada
      aoEscolherVendedor={() => escolherPorta('vendedor')}
      aoEscolherLider={() => escolherPorta('lider')}
    />
  )
  }
}
