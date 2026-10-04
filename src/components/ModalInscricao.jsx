import { useState } from 'react'
import Modal from './Modal'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { useSessao } from '../hooks/useSessao'
import { enviarComprovanteDeInscricao, validarArquivo } from '../lib/db/arquivos'
import { traduzirErro } from '../lib/db/erros'
import { formatarMoeda } from '../utils/formato'

/**
 * Registra ou confirma uma inscrição no acampamento.
 *
 * Três jeitos de chegar aqui: alguém pagou o ingresso direto na hora (sem
 * vendedor ligado); um vendedor fechou a conta das rifas e está virando
 * inscrito (nome fixo, sai da lista de vendedores); ou alguém preencheu o
 * formulário público (QR code) e está "pendente" — aqui o dev confirma que
 * recebeu o pagamento pessoalmente e completa o valor.
 */
export default function ModalInscricao({ vendedor, precisaFechar, valorSugerido, inscricaoExistente, aoFechar }) {
  const { grupo } = useSessao()
  const { adicionarInscricao, inscreverVendedorPorRifa, editarInscricao } = useDadosRifa()

  const nome0 = vendedor?.nome || inscricaoExistente?.nome || ''
  const [nome, setNome] = useState(nome0)
  const [telefone, setTelefone] = useState(vendedor?.telefone || inscricaoExistente?.telefone || '')
  const [pagamento, setPagamento] = useState(inscricaoExistente?.pagamento || 'dinheiro')
  const [status, setStatus] = useState('pago')
  const [valor, setValor] = useState(String(valorSugerido || inscricaoExistente?.valor || ''))
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState('')
  const [etapa, setEtapa] = useState('')

  const nomeFixo = Boolean(vendedor || inscricaoExistente)

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
    if (!nomeFixo && !nome.trim()) return setErro('Digite o nome da pessoa.')
    if (!valor || parseFloat(valor) <= 0) return setErro('Informe o valor pago.')

    setErro('')
    try {
      const idTemporario = inscricaoExistente?.id || globalThis.crypto?.randomUUID?.() || String(Date.now())

      const dados = {
        telefone: telefone.trim(),
        pagamento,
        valor: parseFloat(valor),
        status,
      }

      if (arquivo) {
        setEtapa('Enviando comprovante…')
        dados.comprovantePath = await enviarComprovanteDeInscricao(
          vendedor?.grupo || inscricaoExistente?.grupo || grupo,
          idTemporario,
          arquivo
        )
      } else if (!inscricaoExistente) {
        dados.comprovantePath = ''
      }

      setEtapa('Salvando…')
      if (vendedor) {
        await inscreverVendedorPorRifa(vendedor, dados, precisaFechar)
      } else if (inscricaoExistente) {
        await editarInscricao(inscricaoExistente.id, dados)
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
      titulo={
        vendedor
          ? `Inscrever ${vendedor.nome}`
          : inscricaoExistente
            ? `Confirmar pagamento — ${inscricaoExistente.nome}`
            : 'Nova inscrição'
      }
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

      {inscricaoExistente && (
        <p className="texto-ajuda">
          Ela preencheu o formulário e está esperando você confirmar o pagamento pessoalmente.
        </p>
      )}

      {nomeFixo ? (
        <div className="field">
          <label>Nome</label>
          <p>{nome}</p>
        </div>
      ) : (
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
