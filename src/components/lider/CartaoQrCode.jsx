import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

/** QR Code do endereço do app — pra imprimir ou mostrar num aparelho. */
export default function CartaoQrCode() {
  const canvasRef = useRef(null)
  const [erro, setErro] = useState('')
  const link = window.location.origin

  useEffect(() => {
    QRCode.toCanvas(canvasRef.current, link, { width: 220, margin: 1 }).catch((e) =>
      setErro(e.message)
    )
  }, [link])

  function baixar() {
    const a = document.createElement('a')
    a.href = canvasRef.current.toDataURL('image/png')
    a.download = 'qrcode-rifas.png'
    a.click()
  }

  return (
    <div className="card">
      <h2>QR Code de acesso</h2>
      <p className="texto-ajuda">
        Aponte a câmera do celular pra abrir o app direto, sem digitar o link. Dá pra imprimir ou
        deixar num aparelho pra galera escanear.
      </p>
      {erro && <p className="error-text">{erro}</p>}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <canvas ref={canvasRef} />
      </div>
      <button className="btn btn-primary btn-block" onClick={baixar}>
        Baixar QR Code
      </button>
    </div>
  )
}
