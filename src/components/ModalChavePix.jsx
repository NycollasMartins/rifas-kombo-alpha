import { useState } from 'react'
import Modal from './Modal'
import CamposChavePix from './CamposChavePix'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { formatarChavePix, normalizarChavePix } from '../utils/chavePix'
import { traduzirErro } from '../lib/db/erros'

/**
 * O vendedor cadastra (ou troca) a chave Pix onde recebe as rifas. É pra
 * ela que vai o dinheiro de quem apadrinhar ele — sem chave, ele nem
 * aparece na lista do apadrinhamento.
 *
 * Abre sozinho ao entrar no app enquanto a chave não existe (TelaVendedor);
 * "Agora não" só fecha — a faixa no topo continua cobrando.
 */
export default function ModalChavePix({ atual, aoFechar, aoSalvar }) {
  const { salvarMinhaChavePix } = useDadosRifa()
  const [valor, setValor] = useState({
    tipo: atual?.tipo || 'cpf',
    chave: atual ? formatarChavePix(atual.tipo, atual.chave) : '',
    titular: atual?.titular || '',
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    const { chave, erro: problema } = normalizarChavePix(valor.tipo, valor.chave)
    if (problema) return setErro(problema)
    if (valor.titular.trim().length < 3) return setErro('Digite o nome do titular da conta.')

    setErro('')
    setSalvando(true)
    try {
      const salva = { tipo: valor.tipo, chave, titular: valor.titular.trim() }
      await salvarMinhaChavePix(salva)
      aoSalvar?.(salva)
      aoFechar()
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível salvar sua chave Pix.'))
      setSalvando(false)
    }
  }

  return (
    <Modal
      titulo={atual ? 'Alterar chave Pix' : 'Cadastre sua chave Pix'}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar} disabled={salvando}>
            {atual ? 'Cancelar' : 'Agora não'}
          </button>
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar chave'}
          </button>
        </>
      }
    >
      <p className="texto-ajuda" style={{ marginBottom: 14 }}>
        Precisamos da chave Pix <strong>onde você recebe o dinheiro das rifas</strong>. Quando
        alguém te apadrinhar, o Pix cai direto nela.
        {!atual && ' Enquanto não cadastrar, você não aparece na lista do apadrinhamento.'}
      </p>

      <CamposChavePix valor={valor} aoMudar={setValor} prefixoId="minha-pix" />

      <p className="texto-ajuda">
        Se a conta é do seu pai, mãe ou responsável, coloque o nome dele(a) como titular — é o nome
        que aparece pra quem for pagar.
      </p>

      {erro && <p className="error-text">{erro}</p>}
    </Modal>
  )
}
