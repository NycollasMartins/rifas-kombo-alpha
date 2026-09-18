import { useRef, useState } from 'react'
import BotoesDoWhatsapp from './BotoesDoWhatsapp'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { enviarTermo, gerarLinkDoTermo, removerTermo } from '../lib/db/arquivos'
import { montarMensagemDoTermo } from '../utils/whatsapp'
import { formatarPrazo } from '../utils/prazo'
import estilos from './PainelTermo.module.css'

/**
 * Termo de compromisso assinado, anexado ao perfil do vendedor.
 *
 * Vai para um espaço privado, separado por grupo: a liderança do Alpha não
 * abre um termo do Kombo nem sabendo o endereço. Cada abertura gera um link
 * que expira em 10 minutos. O vendedor nunca enxerga nenhum termo.
 */
export default function PainelTermo({ vendedor }) {
  const { config, buscarDadosPrivados, salvarPrivadoDoVendedor } = useDadosRifa()
  const privado = buscarDadosPrivados(vendedor.id)

  const inputArquivo = useRef(null)
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')

  async function aoEscolherArquivo(evento) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return

    setErro('')
    setOcupado('Enviando…')
    try {
      const caminho = await enviarTermo(vendedor.grupo, vendedor.id, arquivo, privado.termoPath)
      await salvarPrivadoDoVendedor(vendedor.id, {
        termoPath: caminho,
        termoAssinadoEm: privado.termoAssinadoEm || new Date().toISOString().slice(0, 10),
      })
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado('')
    }
  }

  async function abrir() {
    setErro('')
    setOcupado('Abrindo…')
    try {
      window.open(await gerarLinkDoTermo(privado.termoPath), '_blank', 'noopener')
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado('')
    }
  }

  async function remover() {
    if (!confirm('Remover o termo anexado deste vendedor?')) return
    setErro('')
    setOcupado('Removendo…')
    try {
      await removerTermo(privado.termoPath)
      await salvarPrivadoDoVendedor(vendedor.id, { termoPath: '', termoAssinadoEm: '' })
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado('')
    }
  }

  const assinadoDigitalmente = Boolean(privado.termoAssinatura)

  return (
    <div className={estilos.caixa}>
      <div className={estilos.cabecalho}>
        <strong className={estilos.titulo}>Termo de compromisso</strong>
        {privado.termoPath || assinadoDigitalmente ? (
          <span className="tag tag-good">{assinadoDigitalmente ? 'Assinado digital' : 'Anexado'}</span>
        ) : (
          <span className="tag tag-warn">Falta assinar</span>
        )}
      </div>

      {assinadoDigitalmente && (
        <p className={estilos.ajuda}>
          Assinado digitalmente por <strong>{privado.termoAssinatura}</strong> em{' '}
          {formatarPrazo(privado.termoAssinadoEm)}.
        </p>
      )}

      <p className={estilos.ajuda}>
        {privado.termoPath
          ? `Também tem arquivo anexado. Só a liderança do ${vendedor.grupo} consegue abrir.`
          : assinadoDigitalmente
            ? 'Se quiser, ainda dá pra anexar o PDF ou a foto do papel também.'
            : 'A pessoa ainda não assinou digitalmente. Se preferir, anexe o PDF ou a foto do papel assinado (até 10 MB).'}
      </p>

      {!assinadoDigitalmente && (
        <div style={{ marginBottom: 12 }}>
          <p className={estilos.ajuda} style={{ margin: '0 0 6px' }}>
            Reenviar o lembrete de assinar, por WhatsApp:
          </p>
          <BotoesDoWhatsapp
            telefone={vendedor.telefone}
            mensagem={montarMensagemDoTermo({
              nome: vendedor.nome,
              grupo: vendedor.grupo,
              precoRifa: config.precoRifa,
              meta: vendedor.meta ?? config.metaPadrao,
              prazoFinal: config.prazoFinal,
            })}
            compacto
          />
        </div>
      )}

      {erro && <p className="error-text">{erro}</p>}

      <div className={estilos.acoes}>
        {privado.termoPath && (
          <button type="button" className="btn btn-sm" onClick={abrir} disabled={Boolean(ocupado)}>
            Abrir
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => inputArquivo.current?.click()}
          disabled={Boolean(ocupado)}
        >
          {ocupado || (privado.termoPath ? 'Trocar arquivo' : 'Anexar arquivo')}
        </button>
        {privado.termoPath && (
          <button
            type="button"
            className="btn-ghost btn-sm btn-danger"
            onClick={remover}
            disabled={Boolean(ocupado)}
          >
            Remover
          </button>
        )}
      </div>

      <input
        ref={inputArquivo}
        type="file"
        accept="application/pdf,image/*"
        onChange={aoEscolherArquivo}
        hidden
      />
    </div>
  )
}
