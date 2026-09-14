import { useEffect, useState } from 'react'
import { eIphoneOuIpad, jaEstaInstalado } from '../utils/instalacao'
import { useSessao } from '../hooks/useSessao'
import GuiaDeInstalacaoIphone from './GuiaDeInstalacaoIphone'
import estilos from './ConviteParaInstalar.module.css'

/**
 * Cartãozinho no canto de baixo oferecendo deixar o app na tela de início.
 *
 * Aparece SEMPRE que a pessoa abre o app sem tê-lo instalado. Fechar vale só
 * para a visita atual — nada fica guardado no navegador. Some de vez só depois
 * de instalado.
 *
 * O que muda entre os aparelhos é só o jeito de instalar:
 *
 *   Android/computador, com o navegador colaborando -> botão que instala.
 *   iPhone -> botão que abre o passo a passo; a Apple não deixa um site
 *             instalar nada, então o máximo possível é ensinar o caminho.
 *   Resto  -> instrução genérica pelo menu do navegador.
 *
 * O botão de verdade depende de um evento que o Chrome dispara quando QUER:
 * ele tem heurísticas próprias e às vezes segura o evento em visitas
 * seguintes. Por isso o convite nunca depende dele para aparecer — sem o
 * evento, cai na instrução.
 */

const ESPERA_PELO_NAVEGADOR = 1500

export default function ConviteParaInstalar() {
  const { temAcesso } = useSessao()
  const [promptDoNavegador, setPromptDoNavegador] = useState(null)
  const [pronto, setPronto] = useState(false)
  const [instalado, setInstalado] = useState(() => jaEstaInstalado())
  const [fechado, setFechado] = useState(false)
  const [instalando, setInstalando] = useState(false)
  const [guiaAberto, setGuiaAberto] = useState(false)

  useEffect(() => {
    if (instalado) return undefined

    function aoPoderInstalar(evento) {
      evento.preventDefault()
      setPromptDoNavegador(evento)
    }
    function aoInstalar() {
      setInstalado(true)
    }
    window.addEventListener('beforeinstallprompt', aoPoderInstalar)
    window.addEventListener('appinstalled', aoInstalar)

    // Um respiro antes de aparecer: dá tempo do navegador oferecer o botão de
    // verdade, e evita o cartão pulando na cara de quem acabou de abrir.
    const timer = setTimeout(() => setPronto(true), ESPERA_PELO_NAVEGADOR)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [instalado])

  // Entrou na conta: mostra de novo, porque a maioria só se convence de
  // instalar depois de ver o app funcionando.
  useEffect(() => {
    if (temAcesso) setFechado(false)
  }, [temAcesso])

  async function instalar() {
    if (!promptDoNavegador) return
    setInstalando(true)
    promptDoNavegador.prompt()
    await promptDoNavegador.userChoice
    setPromptDoNavegador(null)
    setInstalando(false)
    setFechado(true)
  }

  if (instalado || fechado || !pronto) return null

  const noIphone = eIphoneOuIpad()

  // Com o guia aberto, o cartão do canto sai de cena: os dois juntos
  // disputariam a atenção de quem só quer seguir o passo a passo.
  if (guiaAberto) {
    return <GuiaDeInstalacaoIphone aoFechar={() => setFechado(true)} />
  }

  return (
    <>
      <div className={estilos.convite} role="dialog" aria-label="Instalar o app">
        <div className={estilos.icone}>🔥</div>

        <div className={estilos.conteudo}>
          <strong className={estilos.titulo}>Deixe na tela de início</strong>
          <span className={estilos.texto}>
            Instale o app e abra direto, sem procurar o link.
          </span>

          {promptDoNavegador ? (
            <button className="btn btn-primary btn-sm" onClick={instalar} disabled={instalando}>
              {instalando ? 'Instalando…' : 'Instalar'}
            </button>
          ) : noIphone ? (
            // No iPhone o botão não instala — abre o passo a passo, que é o
            // máximo que a Apple permite a um site.
            <button className="btn btn-primary btn-sm" onClick={() => setGuiaAberto(true)}>
              Instalar
            </button>
          ) : (
            <span className={estilos.instrucao}>
              No menu do navegador (⋮), toque em <strong>Instalar app</strong> ou{' '}
              <strong>Adicionar à tela de início</strong>.
            </span>
          )}
        </div>

        <button className={estilos.fechar} onClick={() => setFechado(true)} aria-label="Agora não">
          ×
        </button>
      </div>
    </>
  )
}
