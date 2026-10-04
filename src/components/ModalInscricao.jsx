import { useState } from 'react'
import Modal from './Modal'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { useSessao } from '../hooks/useSessao'
import { enviarComprovanteDeInscricao, validarArquivo } from '../lib/db/arquivos'
import { traduzirErro } from '../lib/db/erros'
import { formatarMoeda } from '../utils/formato'

/**
 * Registra uma inscrição no acampamento.
 *
 * Dois jeitos de chegar aqui: alguém pagou o ingresso direto (sem vendedor
 * ligado), ou um vendedor fechou a conta das rifas e está virando inscrito
 * — nesse caso o nome vem fixo e, ao salvar, ele sai da lista de vendedores.
 */
export default function ModalInscricao({ vendedor, precisaFechar, valorSugerido, aoFechar }) {
  const { grupo } = useSessao()
  const { adicionarInscricao, inscreverVendedorPorRifa } = useDadosRifa()

  const [nome, setNome] = useState(vendedor?.nome || '')
  const [telefone, setTelefone] = useState(vendedor?.telefone || '')
  const [pagamento, setPagamento] = useState('dinheiro')
  const [status, setStatus] = useState('pago')
  const [valor, setValor] = useState(String(valorSugerido || ''))
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState('')
  const [etapa, setEtapa] = useState('')

  function escolherArquivo(evento) {
    const escolhido = evento.target.files?.[0]
    evento.target.value = ''
    if (!escolhido) return
    const problema = validarArquivo(escolhido)
    if (problema) return setErro(problema)
    setErro('')
    setArquivo(escolhido)
  }

  async function salvar() {
    if (!vendedor && !nome.trim()) return setErro('Digite o nome da pessoa.')
    if (!valor || parseFloat(valor) <= 0) return setErro('Informe o valor pago.')

    setErro('')
    try {
      let comprovantePath = ''
      const idTemporario = globalThis.crypto?.randomUUID?.() || String(Date.now())

      if (arquivo) {
        setEtapa('Enviando comprovante…')
        comprovantePath = await enviarComprovanteDeInscricao(
          vendedor?.grupo || grupo,
          idTemporario,
          arquivo
        )
      }

      const dados = {
        telefone: telefone.trim(),
        pagamento,
        valor: parseFloat(valor),
        status,
        comprovantePath,
      }

      setEtapa('Salvando…')
      if (vendedor) {
        await inscreverVendedorPorRifa(vendedor, dados, precisaFechar)
      } else {
        await adicionarInscricao({ ...dados, nome: nome.trim() })
      }
      aoFechar()
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível salvar a inscrição.'))
    } finally {
      setEtapa('')
    }
  }

  return (
    <Modal
      titulo={vendedor ? `Inscrever ${vendedor.nome}` : 'Nova inscrição'}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar} disabled={Boolean(etapa)}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={salvar} disabled={Boolean(etapa)}>
            {etapa || 'Salvar'}
          </button>
        </>
      }
    >
      {vendedor && precisaFechar && (
        <p className="texto-ajuda">
          Ele ainda não vendeu todas as rifas — ao salvar, as que faltam entram no nome dele como
          "próprias" (igual ao Fechar meta), e ele passa a inscrito.
        </p>
      )}

      {!vendedor && (
        <div className="field">
          <label htmlFor="insc-nome">Nome</label>
          <input
            id="insc-nome"
            placeholder="Nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="insc-telefone">Telefone</label>
        <input
          id="insc-telefone"
          type="tel"
          placeholder="(00) 00000-0000"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="insc-valor">Valor pago (R$)</label>
        <input
          id="insc-valor"
          type="number"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="insc-pagamento">Como foi pago</label>
        <select id="insc-pagamento" value={pagamento} onChange={(e) => setPagamento(e.target.value)}>
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">Pix</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="insc-status">Status</label>
        <select id="insc-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="insc-comprovante">Comprovante (opcional)</label>
        <input id="insc-comprovante" type="file" accept="image/*,.pdf" onChange={escolherArquivo} />
        {arquivo && <p className="texto-ajuda">Selecionado: {arquivo.name}</p>}
      </div>

      {valor && !isNaN(parseFloat(valor)) && (
        <p className="texto-ajuda">Total: {formatarMoeda(parseFloat(valor))}</p>
      )}

      {erro && <p className="error-text">{erro}</p>}
    </Modal>
  )
}
