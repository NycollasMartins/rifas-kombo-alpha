import { useState } from 'react'
import Modal from './Modal'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { montarMensagemDoTermo } from '../utils/whatsapp'
import { traduzirErro } from '../lib/db/erros'

/**
 * Assinatura digital do termo: a pessoa só lê (nada pra preencher, já vem
 * com nome/meta/prazo dela) e digita o próprio nome pra confirmar. Fica
 * salvo no sistema na hora — sem papel, sem PDF, sem ida e volta.
 */
export default function ModalAssinarTermo({ vendedor, grupo, aoFechar }) {
  const { config, assinarMeuTermo } = useDadosRifa()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const texto = montarMensagemDoTermo({
    nome: vendedor.nome,
    grupo,
    precoRifa: config.precoRifa,
    meta: vendedor.meta ?? config.metaPadrao,
    prazoFinal: config.prazoFinal,
  })

  async function assinar() {
    if (nome.trim().length < 3) return setErro('Digite seu nome completo.')
    setErro('')
    setSalvando(true)
    try {
      await assinarMeuTermo(nome.trim(), texto)
      aoFechar()
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível assinar.'))
      setSalvando(false)
    }
  }

  return (
    <Modal
      titulo="Termo de compromisso"
      aoFechar={aoFechar}
      soFechaNoX
      rodape={
        <button className="btn btn-primary btn-block" onClick={assinar} disabled={salvando}>
          {salvando ? 'Assinando…' : 'Li e assino este termo'}
        </button>
      }
    >
      <p
        className="texto-ajuda"
        style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 18 }}
      >
        {texto}
      </p>

      <div className="field">
        <label htmlFor="assinatura-nome">Digite seu nome completo para assinar</label>
        <input
          id="assinatura-nome"
          placeholder="Seu nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      {erro && <p className="error-text">{erro}</p>}
    </Modal>
  )
}
