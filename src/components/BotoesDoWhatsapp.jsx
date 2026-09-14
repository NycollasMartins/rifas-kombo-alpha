import { useState } from 'react'
import { copiarTexto, linkDoWhatsapp, telefoneServeParaWhatsapp } from '../utils/whatsapp'
import estilos from './BotoesDoWhatsapp.module.css'

/**
 * Abre o WhatsApp com uma mensagem pronta (montada por quem chama este
 * componente) — quem aperta enviar é o vendedor ou a liderança. Sem telefone,
 * ou se o número não der para reconhecer, sobra o "Copiar mensagem", que
 * resolve igual: cola em qualquer conversa.
 */
export default function BotoesDoWhatsapp({ telefone, mensagem, compacto }) {
  const [copiado, setCopiado] = useState(false)

  const temTelefone = telefoneServeParaWhatsapp(telefone)

  async function copiar() {
    const deu = await copiarTexto(mensagem)
    setCopiado(deu)
    if (deu) setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <div className={estilos.acoes}>
      {temTelefone ? (
        <a
          className={`btn btn-primary ${compacto ? 'btn-sm' : ''}`}
          href={linkDoWhatsapp(telefone, mensagem)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Enviar no WhatsApp
        </a>
      ) : (
        <span className={estilos.semTelefone}>
          {telefone ? 'Telefone não reconhecido' : 'Sem telefone'}
        </span>
      )}

      <button type="button" className={`btn ${compacto ? 'btn-sm' : ''}`} onClick={copiar}>
        {copiado ? 'Copiado!' : 'Copiar mensagem'}
      </button>
    </div>
  )
}
