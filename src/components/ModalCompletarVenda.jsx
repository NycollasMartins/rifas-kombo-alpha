import { useRef, useState } from 'react'
import Modal from './Modal'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { enviarComprovante, validarArquivo } from '../lib/db/arquivos'
import { formatarMoeda, formatarNumeroRifa, rotuloPagamento } from '../utils/formato'
import { traduzirErro } from '../lib/db/erros'
import estilos from './ModalNovaVenda.module.css'

/**
 * O vendedor volta numa compra que ficou incompleta: marca como pago (ou
 * confirma que ainda está pendente) e anexa o comprovante do Pix que faltou
 * na hora.
 *
 * Só aparece na lista quando falta algo — ver CompraDoVendedor. E só
 * funciona enquanto o repasse ainda não começou a ser conferido pela
 * liderança (regra do banco, não desta tela).
 */
export default function ModalCompletarVenda({ lote, precoRifa, grupo, aoFechar }) {
  const { completarCompra } = useDadosRifa()
  const v = lote.primeira
  const valor = lote.rifas.length * precoRifa
  const inputArquivo = useRef(null)

  const [status, setStatus] = useState(v.status)
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
    setErro('')
    try {
      const dados = { status }
      if (arquivo) {
        setEtapa('Enviando comprovante…')
        dados.comprovantePath = await enviarComprovante(grupo, v.loteId, arquivo)
      }
      setEtapa('Salvando…')
      await completarCompra(v.loteId, dados)
      aoFechar()
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível salvar.'))
    } finally {
      setEtapa('')
    }
  }

  return (
    <Modal
      titulo="Completar venda"
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
      <p className="texto-ajuda">
        <strong>{v.comprador}</strong> · {rotuloPagamento(v.pagamento)} · {formatarMoeda(valor)}
      </p>

      <div className={estilos.numeros} style={{ marginBottom: 16 }}>
        {lote.rifas.map((r) => (
          <span key={r.id} className={estilos.numero}>
            {formatarNumeroRifa(r.numero)}
          </span>
        ))}
      </div>

      <div className="field">
        <label htmlFor="completar-status">Situação do pagamento</label>
        <select id="completar-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pago">Já recebi</option>
          <option value="pendente">Ainda vou receber</option>
        </select>
      </div>

      {v.pagamento === 'pix' && (
        <div className={estilos.comprovante}>
          <div className={estilos.comprovanteTopo}>
            <strong>Comprovante do Pix</strong>
            {(arquivo || v.comprovantePath) && <span className="tag tag-good">Anexado</span>}
          </div>

          {arquivo ? (
            <p className={estilos.nomeArquivo}>{arquivo.name}</p>
          ) : v.comprovantePath ? (
            <p className={estilos.ajudaComprovante}>Já tem um comprovante anexado.</p>
          ) : (
            <p className={estilos.ajudaComprovante}>Ainda sem comprovante — anexe quando tiver.</p>
          )}

          <div className={estilos.acoesComprovante}>
            <button type="button" className="btn btn-sm" onClick={() => inputArquivo.current?.click()}>
              {v.comprovantePath || arquivo ? 'Trocar foto' : 'Anexar foto'}
            </button>
          </div>

          <input
            ref={inputArquivo}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={escolherArquivo}
            hidden
          />
        </div>
      )}

      {erro && <p className="error-text">{erro}</p>}
    </Modal>
  )
}
