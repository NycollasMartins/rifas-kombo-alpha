import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import BotaoVoltar from '../BotaoVoltar'
import { registrarApadrinhamento } from '../../lib/db/apadrinhamento'
import { enviarComprovante, novoLoteId, validarArquivo } from '../../lib/db/arquivos'
import { montarPixCopiaECola, PIX_RECEBEDOR } from '../../utils/pix'
import { formatarMoeda, formatarNumeroRifa } from '../../utils/formato'
import { traduzirErro } from '../../lib/db/erros'
import estilos from './TelaApadrinhar.module.css'

/** Passo 2: quantidade, dados do comprador, Pix e comprovante opcional. */
export default function FormularioApadrinhar({ item, aoVoltar }) {
  const maximo = Math.max(1, Math.min(50, Math.ceil(item.disponivel / item.preco)))

  const [quantidade, setQuantidade] = useState(1)
  const [comprador, setComprador] = useState('')
  const [telefone, setTelefone] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const inputArquivo = useRef(null)
  const canvasRef = useRef(null)

  const total = quantidade * item.preco
  const pix = useMemo(
    () =>
      montarPixCopiaECola({
        ...PIX_RECEBEDOR,
        valor: total,
        identificador: `RIFA${item.vendedorId.replace(/-/g, '').slice(0, 20)}`,
      }),
    [total, item.vendedorId]
  )

  useEffect(() => {
    QRCode.toCanvas(canvasRef.current, pix, { width: 220, margin: 1 }).catch(() => {})
  }, [pix])

  function ajustar(delta) {
    setQuantidade((q) => Math.max(1, Math.min(maximo, q + delta)))
  }

  function escolherArquivo(evento) {
    const escolhido = evento.target.files?.[0]
    evento.target.value = ''
    if (!escolhido) return
    const problema = validarArquivo(escolhido)
    if (problema) return setErro(problema)
    setErro('')
    setArquivo(escolhido)
  }

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(pix)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErro('Não deu pra copiar sozinho — selecione e copie o código manualmente.')
    }
  }

  async function concluir() {
    if (!comprador.trim()) return setErro('Digite o seu nome.')
    setErro('')
    setEnviando(true)
    try {
      let comprovantePath = ''
      if (arquivo) {
        const loteId = novoLoteId()
        comprovantePath = await enviarComprovante(item.grupo, loteId, arquivo)
      }
      const criadas = await registrarApadrinhamento({
        vendedorId: item.vendedorId,
        quantidade,
        comprador: comprador.trim(),
        telefone: telefone.trim(),
        comprovantePath,
      })
      setResultado(criadas)
    } catch (e) {
      setErro(traduzirErro(e, e.message))
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <div className={estilos.pagina}>
        <div className={`card ${estilos.confirmacao}`}>
          <div className={estilos.chama}>🎉</div>
          <h2>Apadrinhamento registrado!</h2>
          <p className="texto-ajuda">
            Muito obrigado por ajudar <strong>{item.nome}</strong> a chegar ao acampamento.
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
          {arquivo ? (
            <p className="texto-ajuda">
              Recebemos o seu comprovante — assim que a liderança conferir, isso já conta pra meta
              dele(a).
            </p>
          ) : (
            <p className="texto-ajuda">
              Se ainda não fez o Pix, é só escanear o QR Code que apareceu antes. Se puder, mande o
              comprovante depois pra liderança confirmar mais rápido.
            </p>
          )}
          <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
            Apadrinhar outra pessoa
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={estilos.pagina}>
      <BotaoVoltar aoClicar={aoVoltar} />

      <div className="card">
        <h2>Apadrinhando {item.nome}</h2>
        <p className="texto-ajuda">
          Faltam {formatarMoeda(item.disponivel)} pra ele(a) completar a meta.
        </p>

        {erro && <p className="error-text">{erro}</p>}

        <label className="rotulo-solto">Quantas rifas você quer apadrinhar?</label>
        <div className={estilos.seletorQuantidade}>
          <button type="button" className="btn btn-sm" onClick={() => ajustar(-1)} disabled={quantidade <= 1}>
            −
          </button>
          <span className={estilos.quantidade}>{quantidade}</span>
          <button type="button" className="btn btn-sm" onClick={() => ajustar(1)} disabled={quantidade >= maximo}>
            +
          </button>
        </div>
        <p className={estilos.totalEmReais}>{formatarMoeda(total)}</p>

        <div className="field">
          <label htmlFor="apadrinhar-nome">Seu nome</label>
          <input
            id="apadrinhar-nome"
            value={comprador}
            onChange={(e) => setComprador(e.target.value)}
            placeholder="Nome completo"
          />
        </div>
        <div className="field">
          <label htmlFor="apadrinhar-telefone">Seu telefone (opcional)</label>
          <input
            id="apadrinhar-telefone"
            type="tel"
            inputMode="tel"
            placeholder="(00) 00000-0000"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>

        <div className={estilos.pix}>
          <strong>Pague via Pix</strong>
          <canvas ref={canvasRef} className={estilos.qrcode} />
          <button type="button" className="btn btn-sm" onClick={copiarPix}>
            {copiado ? 'Copiado!' : 'Copiar código Pix'}
          </button>
          <p className="texto-ajuda" style={{ marginTop: 8 }}>
            Abra o Pix do seu banco, escolha "Pix Copia e Cola" ou aponte a câmera pro QR Code — o
            valor de {formatarMoeda(total)} já vem preenchido.
          </p>
        </div>

        <div className="field">
          <label>Comprovante do Pix (opcional, mas ajuda a confirmar mais rápido)</label>
          {arquivo && <p className={estilos.nomeArquivo}>{arquivo.name}</p>}
          <button type="button" className="btn btn-sm" onClick={() => inputArquivo.current?.click()}>
            {arquivo ? 'Trocar foto' : 'Anexar comprovante'}
          </button>
          <input
            ref={inputArquivo}
            type="file"
            accept="image/*,application/pdf"
            onChange={escolherArquivo}
            hidden
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          onClick={concluir}
          disabled={enviando}
        >
          {enviando ? 'Enviando…' : 'Concluir apadrinhamento'}
        </button>
      </div>
    </div>
  )
}
