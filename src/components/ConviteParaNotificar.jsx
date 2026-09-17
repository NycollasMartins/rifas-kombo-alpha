import { useEffect, useState } from 'react'
import { inscreverPush, suportaPush } from '../utils/instalacao'
import { salvarInscricaoPush } from '../lib/db/notificacoes'
import estilos from './ConviteParaInstalar.module.css'

const VAPID_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY

/**
 * Pede pra ativar notificação de verdade (barra do celular), pro vendedor
 * saber na hora quando sai um prazo ou uma data de acerto novos.
 *
 * Aparece toda vez que não estiver ativada — igual ao convite de instalar.
 * Ativou, some de vez (o navegador já sabe: Notification.permission).
 */
export default function ConviteParaNotificar({ vendedorId }) {
  const [fechado, setFechado] = useState(false)
  const [ativando, setAtivando] = useState(false)
  const [erro, setErro] = useState('')

  const jaAtivo = typeof Notification !== 'undefined' && Notification.permission === 'granted'
  const podeMostrar = VAPID_PUBLICA && suportaPush() && !jaAtivo && !fechado

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'denied') setFechado(true)
  }, [])

  if (!podeMostrar) return null

  async function ativar() {
    setErro('')
    setAtivando(true)
    try {
      const inscricao = await inscreverPush(VAPID_PUBLICA)
      await salvarInscricaoPush(vendedorId, inscricao)
      setFechado(true)
    } catch (e) {
      setErro(e.message)
    } finally {
      setAtivando(false)
    }
  }

  return (
    <div className={estilos.convite} role="dialog" aria-label="Ativar notificações">
      <div className={estilos.icone}>🔔</div>
      <div className={estilos.conteudo}>
        <strong className={estilos.titulo}>Ativar notificações</strong>
        <span className={estilos.texto}>
          Receba na hora quando sair um prazo novo ou a data do acerto.
        </span>
        {erro && <span className={estilos.texto}>{erro}</span>}
        <button className="btn btn-primary btn-sm" onClick={ativar} disabled={ativando}>
          {ativando ? 'Ativando…' : 'Ativar'}
        </button>
      </div>
      <button className={estilos.fechar} onClick={() => setFechado(true)} aria-label="Agora não">
        ×
      </button>
    </div>
  )
}
