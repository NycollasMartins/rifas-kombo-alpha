import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

/** QR Code do formulário público de inscrição deste grupo. */
export default function CartaoQrCodeInscricao({ grupo }) {
  const canvasRef = useRef(null)
  const [erro, setErro] = useState('')
  const link = `${window.location.origin}/inscricao/${String(grupo).toLowerCase()}`

  useEffect(() => {
    QRCode.toCanvas(canvasRef.current, link, { width: 180, margin: 1 }).catch((e) =>
      setErro(e.message)
    )
  }, [link])

  function baixar() {
    const a = document.createElement('a')
    a.href = canvasRef.current.toDataURL('image/png')
    a.download = `qrcode-inscricao-${grupo}.png`
    a.click()
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2>Formulário de inscrição ({grupo})</h2>
      <p className="texto-ajuda">
        A pessoa escaneia, preenche o nome e o telefone dela, e cai pendente aqui embaixo. Depois
        que você receber o pagamento pessoalmente, confirme na lista.
      </p>
      {erro && <p className="error-text">{erro}</p>}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
        <canvas ref={canvasRef} />
      </div>
      <p className="texto-ajuda" style={{ textAlign: 'center', wordBreak: 'break-all' }}>
        {link}
      </p>
      <button className="btn btn-sm btn-block" onClick={baixar}>
        Baixar QR Code
      </button>
    </div>
  )
}
