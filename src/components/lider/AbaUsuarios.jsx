import { useEffect, useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import { useSessao } from '../../hooks/useSessao'
import { excluirLider, listarLideres } from '../../lib/db/perfis'
import { formatarDataHora } from '../../utils/formato'
import { traduzirErro } from '../../lib/db/erros'

/**
 * Quantos líderes o grupo tem. Qualquer líder vê a lista; só o dev exclui —
 * novos líderes continuam entrando sozinhos com o código do acampamento,
 * não tem cadastro manual aqui.
 */
export default function AbaUsuarios() {
  const { grupo, eDev } = useSessao()
  const [lideres, setLideres] = useState(null)
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState('')

  useEffect(() => {
    let ativo = true
    listarLideres(grupo)
      .then((l) => ativo && setLideres(l))
      .catch((e) => ativo && setErro(traduzirErro(e)))
    return () => {
      ativo = false
    }
  }, [grupo])

  async function excluir(lider) {
    if (!confirm(`Excluir o acesso de líder de ${lider.nome}?`)) return
    setErro('')
    setExcluindo(lider.id)
    try {
      await excluirLider(lider.id)
      setLideres((atual) => atual.filter((l) => l.id !== lider.id))
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível excluir.'))
    } finally {
      setExcluindo('')
    }
  }

  return (
    <>
      <div className="section-head">
        <h2>Líderes ({lideres?.length ?? '…'})</h2>
      </div>

      <p className="texto-ajuda">
        Um novo líder entra sozinho, informando o código do acampamento em "Sou líder → Criar
        acesso de líder" — não precisa cadastrar aqui.
      </p>

      {erro && <p className="error-text">{erro}</p>}

      {lideres === null ? null : lideres.length === 0 ? (
        <EstadoVazio icone="👤">
          <p>Nenhum líder cadastrado ainda.</p>
        </EstadoVazio>
      ) : (
        <div className="card">
          {lideres.map((lider) => (
            <div key={lider.id} className="list-row">
              <div className="info">
                <strong>{lider.nome}</strong>
                <span>líder desde {formatarDataHora(lider.criadoEm)}</span>
              </div>
              {eDev && (
                <div className="actions">
                  <button
                    className="btn-ghost btn-sm btn-danger"
                    onClick={() => excluir(lider)}
                    disabled={excluindo === lider.id}
                  >
                    {excluindo === lider.id ? '…' : 'Excluir'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
