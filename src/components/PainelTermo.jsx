import { useRef, useState } from 'react'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { enviarTermo, gerarLinkDoTermo, removerTermo } from '../lib/db/arquivos'
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
  const { buscarDadosPrivados, salvarPrivadoDoVendedor } = useDadosRifa()
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

  return (
    <div className={estilos.caixa}>
      <div className={estilos.cabecalho}>
        <strong className={estilos.titulo}>Termo de compromisso</strong>
        {privado.termoPath ? (
          <span className="tag tag-good">Anexado</span>
        ) : (
          <span className="tag tag-warn">Falta anexar</span>
        )}
      </div>

      <p className={estilos.ajuda}>
        {privado.termoPath
          ? `Assinado em ${formatarPrazo(privado.termoAssinadoEm) || 'data não informada'}. Só a liderança do ${vendedor.grupo} consegue abrir.`
          : 'Anexe o PDF preenchido ou a foto do papel assinado. Máximo 10 MB.'}
      </p>

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
