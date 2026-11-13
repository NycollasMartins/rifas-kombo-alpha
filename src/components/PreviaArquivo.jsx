import { useEffect, useMemo, useState } from 'react'

/**
 * Miniatura do arquivo escolhido, pra quem anexou ter certeza de que é o
 * comprovante certo. Foto mostra a própria foto; PDF (ou foto que o
 * aparelho não sabe mostrar, como HEIC num Android) mostra um ícone.
 */
export default function PreviaArquivo({ arquivo }) {
  const [falhou, setFalhou] = useState(false)

  const endereco = useMemo(() => {
    if (!arquivo || !String(arquivo.type || '').startsWith('image/')) return ''
    try {
      return URL.createObjectURL(arquivo)
    } catch {
      return ''
    }
  }, [arquivo])

  useEffect(() => {
    setFalhou(false)
    return () => {
      if (endereco) URL.revokeObjectURL(endereco)
    }
  }, [endereco])

  if (!arquivo) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 10px', minWidth: 0 }}>
      {endereco && !falhou ? (
        <img
          src={endereco}
          alt=""
          onError={() => setFalhou(true)}
          style={{
            width: 56,
            height: 56,
            objectFit: 'cover',
            borderRadius: 8,
            border: '1px solid var(--line)',
            flexShrink: 0,
          }}
        />
      ) : (
        <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>📄</span>
      )}
      <span
        style={{
          fontSize: 12.5,
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        ✓ {arquivo.name || 'comprovante'}
      </span>
    </div>
  )
}
