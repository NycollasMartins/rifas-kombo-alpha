import { useState } from 'react'
import { formatarMoeda } from '../utils/formato'
import {
  formatarPrazo,
  gravidadeDoMarco,
  marcoDoPrazo,
  marcoPodeSerDispensado,
  rifasParaFecharMeta,
  textoDoAviso,
} from '../utils/prazo'
import estilos from './AvisoDePrazo.module.css'

/**
 * Os avisos do prazo: 7 dias, 3 dias, 24 horas, o dia do encerramento e
 * depois dele.
 *
 * Cada marco pode ser fechado uma vez, e some só até o próximo — quem
 * dispensou o aviso de 7 dias volta a ser avisado aos 3. Os dois últimos não
 * fecham: são a hora de agir.
 */
export default function AvisoDePrazo({ prazoFinal, faltante, precoRifa, identificador }) {
  const marco = marcoDoPrazo(prazoFinal)
  const chave = `rifas-aviso:${identificador}:${prazoFinal}:${marco}`

  const [dispensado, setDispensado] = useState(() => {
    try {
      return localStorage.getItem(chave) === '1'
    } catch {
      return false
    }
  })

  // Quem já bateu a meta não precisa de cobrança.
  if (!marco || !faltante || faltante <= 0) return null
  if (dispensado && marcoPodeSerDispensado(marco)) return null

  const { titulo, texto } = textoDoAviso(marco, {
    rifasQueFaltam: rifasParaFecharMeta(faltante, precoRifa),
    valorQueFalta: formatarMoeda(faltante),
    dataFormatada: formatarPrazo(prazoFinal),
  })

  function dispensar() {
    setDispensado(true)
    try {
      localStorage.setItem(chave, '1')
    } catch {
      // navegador sem armazenamento: o aviso volta no próximo acesso
    }
  }

  return (
    <div className={`${estilos.aviso} ${estilos[gravidadeDoMarco(marco)]}`}>
      <div className={estilos.conteudo}>
        <strong className={estilos.titulo}>{titulo}</strong>
        <span className={estilos.texto}>{texto}</span>
      </div>
      {marcoPodeSerDispensado(marco) && (
        <button className={estilos.fechar} onClick={dispensar} aria-label="Dispensar aviso">
          ×
        </button>
      )}
    </div>
  )
}
