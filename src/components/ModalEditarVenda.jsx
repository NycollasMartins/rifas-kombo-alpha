import { useState } from 'react'
import Modal from './Modal'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { traduzirErro } from '../lib/db/erros'

/**
 * Correção completa de uma venda já registrada. Só o dev abre esta tela — e,
 * mais importante, só o dev consegue salvar: o banco tem um gatilho que recusa
 * a alteração destes campos vinda de qualquer outro papel.
 */
export default function ModalEditarVenda({ venda, aoFechar }) {
  const { vendedores, corrigirDadosDaVenda } = useDadosRifa()

  const [comprador, setComprador] = useState(venda.comprador)
  const [telefone, setTelefone] = useState(venda.telefone || '')
  const [vendedorId, setVendedorId] = useState(venda.vendedorId)
  const [numero, setNumero] = useState(String(venda.numero))
  const [pagamento, setPagamento] = useState(venda.pagamento)
  const [status, setStatus] = useState(venda.status)
  const [repasse, setRepasse] = useState(venda.repasse || 'pendente')
  const [origem, setOrigem] = useState(venda.origem || 'venda')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!comprador.trim()) {
      setErro('Digite o nome do comprador.')
      return
    }
    const numeroLimpo = parseInt(numero, 10)
    if (!Number.isInteger(numeroLimpo) || numeroLimpo < 1) {
      setErro('O número da rifa precisa ser um inteiro maior que zero.')
      return
    }

    setSalvando(true)
    setErro('')
    try {
      await corrigirDadosDaVenda(venda.id, {
        comprador: comprador.trim(),
        telefone: telefone.trim(),
        vendedorId,
        numero: numeroLimpo,
        pagamento,
        status,
        repasse,
        origem,
      })
      aoFechar()
    } catch (e) {
      const mensagem = traduzirErro(e, 'Não foi possível corrigir a venda.')
      setErro(
        String(mensagem).includes('duplicate') || String(mensagem).includes('já existe')
          ? `Já existe outra rifa com o número ${numeroLimpo}.`
          : mensagem
      )
      setSalvando(false)
    }
  }

  return (
    <Modal
      titulo={`Corrigir rifa #${String(venda.numero).padStart(3, '0')}`}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar correção'}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="ev-comprador">Comprador</label>
        <input
          id="ev-comprador"
          value={comprador}
          onChange={(e) => setComprador(e.target.value)}
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="ev-telefone">Telefone</label>
        <input id="ev-telefone" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="ev-vendedor">Vendedor</label>
        <select id="ev-vendedor" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
          {vendedores
            .filter((v) => v.grupo === venda.grupo)
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="ev-numero">Número da rifa</label>
          <input
            id="ev-numero"
            type="number"
            inputMode="numeric"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="ev-origem">Origem</label>
          <select id="ev-origem" value={origem} onChange={(e) => setOrigem(e.target.value)}>
            <option value="venda">Vendida</option>
            <option value="propria">Compra do próprio vendedor</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="ev-pagamento">Pagamento</label>
          <select id="ev-pagamento" value={pagamento} onChange={(e) => setPagamento(e.target.value)}>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">Pix</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="ev-status">Status</label>
          <select id="ev-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="ev-repasse">Repasse</label>
        <select id="ev-repasse" value={repasse} onChange={(e) => setRepasse(e.target.value)}>
          <option value="pendente">Repasse pendente</option>
          <option value="entregue">Entregue</option>
          <option value="confirmado">Confirmado</option>
        </select>
      </div>

      <p className="texto-ajuda">
        Esta rifa é do <strong>{venda.grupo}</strong>, e só pode passar para um vendedor do mesmo
        grupo — cada grupo tem a numeração dele. Mudar o número não mexe na numeração das
        próximas: se você liberar um número, ele não volta a ser usado sozinho.
      </p>

      {erro && <p className="error-text">{erro}</p>}
    </Modal>
  )
}
