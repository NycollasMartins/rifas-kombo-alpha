import { useEffect, useRef, useState } from 'react'
import { gerarLinkDoComprovante } from '../lib/db/arquivos'
import estilos from './VisualizadorComprovante.module.css'

const ehPdf = (caminho) => /\.pdf$/i.test(caminho || '')

/**
 * Mostra o comprovante DENTRO do app — sem mandar a liderança pro navegador.
 *
 * Foto vai num <img> comum. PDF não dá pra confiar no navegador: o Chrome
 * do Android não mostra PDF dentro da página (só oferece baixar). Por isso
 * o PDF é desenhado página por página com o pdf.js, que só é baixado na
 * primeira vez que alguém abre um PDF — não pesa na abertura do app.
 */
export default function VisualizadorComprovante({ caminho }) {
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const [falhouImagem, setFalhouImagem] = useState(false)

  useEffect(() => {
    let ativo = true
    setLink('')
    setErro('')
    setFalhouImagem(false)
    gerarLinkDoComprovante(caminho)
      .then((l) => ativo && setLink(l))
      .catch((e) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
  }, [caminho])

  if (erro) return <p className="error-text">{erro}</p>
  if (!link) return <p className="texto-ajuda">Carregando o comprovante…</p>

  if (ehPdf(caminho)) return <PaginasDoPdf link={link} />

  if (falhouImagem) {
    // ex: foto HEIC de iPhone aberta num Android — o navegador não sabe mostrar
    return (
      <div className={estilos.aviso}>
        <p className="texto-ajuda">Este aparelho não consegue mostrar esse tipo de foto aqui.</p>
        <a className="btn btn-sm" href={link} download>
          Baixar o arquivo
        </a>
      </div>
    )
  }

  return (
    <img
      className={estilos.imagem}
      src={link}
      alt="Comprovante do Pix"
      onError={() => setFalhouImagem(true)}
    />
  )
}

function PaginasDoPdf({ link }) {
  const caixaRef = useRef(null)
  const [estado, setEstado] = useState('carregando')

  useEffect(() => {
    let cancelado = false
    let documento = null
    const caixa = caixaRef.current

    async function desenhar() {
      try {
        const pdfjs = await import('pdfjs-dist')
        const { default: enderecoDoWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = enderecoDoWorker

        documento = await pdfjs.getDocument({ url: link }).promise
        if (cancelado) return

        const largura = caixa.clientWidth || 320
        const nitidez = Math.min(window.devicePixelRatio || 1, 2)
        // comprovante é 1, no máximo 2 páginas — 5 é só pra não travar com um PDF errado
        const total = Math.min(documento.numPages, 5)

        for (let n = 1; n <= total; n++) {
          const pagina = await documento.getPage(n)
          if (cancelado) return
          const base = pagina.getViewport({ scale: 1 })
          const viewport = pagina.getViewport({ scale: (largura / base.width) * nitidez })

          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.className = estilos.paginaPdf
          caixa.appendChild(canvas)

          await pagina.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        }
        if (!cancelado) setEstado('pronto')
      } catch {
        if (!cancelado) setEstado('erro')
      }
    }

    desenhar()
    return () => {
      cancelado = true
      documento?.destroy()
      caixa.replaceChildren()
    }
  }, [link])

  return (
    <>
      {estado === 'carregando' && <p className="texto-ajuda">Abrindo o PDF…</p>}
      {estado === 'erro' && (
        <div className={estilos.aviso}>
          <p className="error-text">Não deu pra mostrar esse PDF aqui.</p>
          <a className="btn btn-sm" href={link} download>
            Baixar o arquivo
          </a>
        </div>
      )}
      <div ref={caixaRef} className={estilos.pdf} />
    </>
  )
}
