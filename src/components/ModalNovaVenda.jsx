import { useRef, useState } from 'react'
import BotaoArquivo from './BotaoArquivo'
import PreviaArquivo from './PreviaArquivo'
import Modal from './Modal'
import BotoesDoWhatsapp from './BotoesDoWhatsapp'
import { useDadosRifa } from '../hooks/useDadosRifa'
import { useSessao } from '../hooks/useSessao'
import { enviarComprovante, novoLoteId, validarArquivo } from '../lib/db/arquivos'
import { montarMensagemDaCompra } from '../utils/whatsapp'
import { precoDoVendedor } from '../utils/calculos'
import { formatarMoeda, formatarNumeroRifa } from '../utils/formato'
import { traduzirErro } from '../lib/db/erros'
import estilos from './ModalNovaVenda.module.css'

/**
 * Registrar uma compra: uma pessoa pode levar várias rifas de uma vez.
 *
 * Pix pede a foto do comprovante — é o que permite a liderança conferir o
 * dinheiro depois. Dinheiro é declarado pelo vendedor, que assume a entrega.
 * Os números das rifas não aparecem aqui porque quem os define é o banco.
 */
export default function ModalNovaVenda({ vendedorId, aoFechar }) {
  const { config, registrarCompra, buscarVendedor } = useDadosRifa()
  const { grupo } = useSessao()
  const vendedor = buscarVendedor(vendedorId)
  // dois toques rápidos em Salvar registravam a compra duas vezes (rifas em
  // dobro) antes do botão ficar desabilitado na tela
  const salvando = useRef(false)
  // O código da compra nasce junto com a janela e não muda: se a internet
  // cair e o vendedor tocar em Salvar de novo, o banco reconhece a mesma
  // compra e não registra em dobro. O arquivo que já subiu é reaproveitado.
  const loteId = useRef(novoLoteId())
  const envioAnterior = useRef(null)

  const [comprador, setComprador] = useState('')
  const [telefone, setTelefone] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [pagamento, setPagamento] = useState('dinheiro')
  const [status, setStatus] = useState('pago')
  const [arquivo, setArquivo] = useState(null)
  const [anexarDepois, setAnexarDepois] = useState(false)
  const [erro, setErro] = useState('')
  const [etapa, setEtapa] = useState('')
  const [resultado, setResultado] = useState(null)

  const precoRifa = precoDoVendedor(vendedor, config)
  const total = quantidade * precoRifa

  function ajustar(delta) {
    setQuantidade((q) => Math.max(1, Math.min(50, q + delta)))
  }

  function escolherArquivo(escolhido) {
    const problema = validarArquivo(escolhido)
    if (problema) return setErro(problema)
    setErro('')
    setArquivo(escolhido)
    setAnexarDepois(false)
  }

  async function salvar() {
    if (salvando.current) return
    if (!comprador.trim()) return setErro('Digite o nome do comprador.')
    const digitos = telefone.replace(/\D/g, '')
    if (telefone.trim() && (digitos.length < 10 || digitos.length > 13)) {
      return setErro('Confira o telefone: coloque o DDD e o número, ou deixe em branco.')
    }
    if (quantidade < 1 || quantidade > 50) return setErro('A quantidade precisa ser de 1 a 50.')
    if (pagamento === 'pix' && !arquivo && !anexarDepois) {
      return setErro('Anexe o comprovante do Pix, ou marque que vai anexar depois.')
    }

    setErro('')
    salvando.current = true
    try {
      let comprovantePath = ''

      // foto anexada e depois trocou pra "Dinheiro": não manda a foto
      if (pagamento === 'pix' && arquivo) {
        if (envioAnterior.current?.arquivo === arquivo) {
          comprovantePath = envioAnterior.current.caminho
        } else {
          setEtapa('Enviando comprovante…')
          try {
            // a pasta é a do grupo do VENDEDOR da venda
            comprovantePath = await enviarComprovante(
              vendedor?.grupo || grupo,
              loteId.current,
              arquivo
            )
          } catch (e) {
            setErro(
              `${e.message || 'Não foi possível enviar o comprovante.'} Toque em Salvar de novo. ` +
                'Se continuar sem funcionar, tire o arquivo e marque "Não consigo anexar agora".'
            )
            return
          }
          envioAnterior.current = { arquivo, caminho: comprovantePath }
        }
      }

      setEtapa('Registrando…')
      const criadas = await registrarCompra({
        quantidade,
        comprador: comprador.trim(),
        telefone: telefone.trim(),
        pagamento,
        status,
        comprovantePath,
        vendedorId,
        loteId: loteId.current,
      })
      setResultado(criadas)
    } catch (e) {
      if (/não encontramos o comprovante/i.test(e.message || '')) envioAnterior.current = null
      setErro(traduzirErro(e, 'Não foi possível registrar a venda.'))
    } finally {
      salvando.current = false
      setEtapa('')
    }
  }

  // ---- confirmação, com os números que o banco entregou --------------------
  if (resultado) {
    return (
      <Modal
        titulo="Venda registrada"
        aoFechar={aoFechar}
        rodape={
          <button className="btn btn-primary" onClick={aoFechar}>
            Fechar
          </button>
        }
      >
        <div className={estilos.confirmacao}>
          <div className={estilos.confirmacaoTotal}>{formatarMoeda(total)}</div>
          <p>
            {resultado.length === 1 ? 'Rifa' : `${resultado.length} rifas`} no nome de{' '}
            <strong>{comprador.trim()}</strong>
          </p>
          <div className={estilos.numeros}>
            {resultado
              .slice()
              .sort((a, b) => a.numero - b.numero)
              .map((v) => (
                <span key={v.id} className={estilos.numero}>
                  {formatarNumeroRifa(v.numero)}
                </span>
              ))}
          </div>
          <p className={estilos.aviso}>Anote esses números no talão do comprador.</p>
        </div>

        <div className={estilos.envio}>
          <strong className={estilos.envioTitulo}>Avise o comprador</strong>
          <p className={estilos.envioAjuda}>
            Abre o WhatsApp com a mensagem pronta, com os números, o valor e o seu nome. Você só
            confere e aperta enviar.
          </p>
          <BotoesDoWhatsapp
            telefone={telefone}
            mensagem={montarMensagemDaCompra({
              comprador: comprador.trim(),
              numeros: resultado.map((v) => v.numero),
              valorTotal: total,
              nomeDoVendedor: vendedor?.nome,
              grupo,
              pagamentoPendente: status === 'pendente',
              premio: config.premio,
              dataSorteio: config.dataSorteio,
            })}
          />
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      titulo="Registrar venda"
      aoFechar={aoFechar}
      soFechaNoX
      rodape={
        <>
          <button className="btn" onClick={aoFechar} disabled={Boolean(etapa)}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={salvar} disabled={Boolean(etapa)}>
            {etapa || `Salvar ${formatarMoeda(total)}`}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="venda-comprador">Nome do comprador</label>
        <input
          id="venda-comprador"
          placeholder="Nome completo"
          value={comprador}
          onChange={(e) => setComprador(e.target.value)}
          maxLength={80}
          autoComplete="off"
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="venda-telefone">Telefone (opcional)</label>
        <input
          id="venda-telefone"
          type="tel"
          placeholder="(00) 00000-0000"
          inputMode="tel"
          maxLength={20}
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="venda-qtd">Quantas rifas?</label>
        <div className={estilos.contador}>
          <button type="button" className="btn" onClick={() => ajustar(-1)} aria-label="Menos uma">
            −
          </button>
          <input
            id="venda-qtd"
            type="number"
            inputMode="numeric"
            min="1"
            max="50"
            value={quantidade}
            onChange={(e) =>
              setQuantidade(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))
            }
          />
          <button type="button" className="btn" onClick={() => ajustar(1)} aria-label="Mais uma">
            +
          </button>
        </div>
        <p className={estilos.total}>
          {quantidade} × {formatarMoeda(precoRifa)} = <strong>{formatarMoeda(total)}</strong>
        </p>
      </div>

      <div className="field">
        <label>Como foi pago?</label>
        <div className={estilos.pagamento}>
          <button
            type="button"
            className={`${estilos.opcaoPagamento} ${pagamento === 'dinheiro' ? estilos.ativa : ''}`}
            onClick={() => setPagamento('dinheiro')}
          >
            💵 Dinheiro
          </button>
          <button
            type="button"
            className={`${estilos.opcaoPagamento} ${pagamento === 'pix' ? estilos.ativa : ''}`}
            onClick={() => setPagamento('pix')}
          >
            📱 Pix
          </button>
        </div>
      </div>

      {pagamento === 'dinheiro' && (
        <p className="texto-ajuda">
          Você declara que recebeu {formatarMoeda(total)} em dinheiro e vai repassar à tesouraria.
        </p>
      )}

      {pagamento === 'pix' && (
        <div className={estilos.comprovante}>
          <div className={estilos.comprovanteTopo}>
            <strong>Comprovante do Pix</strong>
            {arquivo && <span className="tag tag-good">Anexado</span>}
          </div>

          {arquivo ? (
            <PreviaArquivo arquivo={arquivo} />
          ) : (
            <p className={estilos.ajudaComprovante}>
              Tire um print ou foto do comprovante. A liderança confere depois.
            </p>
          )}

          <div className={estilos.acoesComprovante}>
            <BotaoArquivo aoEscolher={escolherArquivo}>
              {arquivo ? 'Trocar arquivo' : 'Anexar foto ou PDF'}
            </BotaoArquivo>
            {arquivo && (
              <button
                type="button"
                className="btn-ghost btn-sm btn-danger"
                onClick={() => setArquivo(null)}
              >
                Remover
              </button>
            )}
          </div>

          {!arquivo && (
            <label className={estilos.depois}>
              <input
                type="checkbox"
                checked={anexarDepois}
                onChange={(e) => setAnexarDepois(e.target.checked)}
              />
              Não consigo anexar agora
            </label>
          )}

        </div>
      )}

      <div className="field">
        <label htmlFor="venda-status">Situação do pagamento</label>
        <select id="venda-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pago">Já recebi</option>
          <option value="pendente">Ainda vou receber</option>
        </select>
      </div>

      {erro && <p className="error-text">{erro}</p>}
    </Modal>
  )
}
