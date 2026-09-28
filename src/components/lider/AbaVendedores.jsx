import { useState } from 'react'
import EstadoVazio from '../EstadoVazio'
import EtiquetaSituacao from '../EtiquetaSituacao'
import ModalVendedor from '../ModalVendedor'
import ModalVendasDoVendedor from '../ModalVendasDoVendedor'
import { useDadosRifa } from '../../hooks/useDadosRifa'
import { resumoDoVendedor, vendasDoVendedor } from '../../utils/calculos'
import { formatarMoeda } from '../../utils/formato'
import { baixarCsvDeVendedores } from '../../utils/csv'
import { rifasParaFecharMeta } from '../../utils/prazo'
import { traduzirErro } from '../../lib/db/erros'
import estilos from './AbaVendedores.module.css'

/** Os vendedores do grupo: cadastro, termo, vendas e fechamento de meta. */
export default function AbaVendedores() {
  const { config, vendedores, vendas, dadosPrivados, removerVendedor, fecharMeta } = useDadosRifa()

  const [emEdicao, setEmEdicao] = useState(null) // 'novo' | vendedor
  const [vendoVendasDe, setVendoVendasDe] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState('')

  async function excluir(vendedor) {
    const quantidade = vendasDoVendedor(vendas, vendedor.id).length
    if (quantidade > 0) {
      alert(
        `${vendedor.nome} já tem ${quantidade} rifa(s) registrada(s) e não pode ser excluído — ` +
          'o registro desse dinheiro precisa continuar existindo.\n\n' +
          'Se ele não vai mais ao acampamento, edite e marque a situação como "Desistiu".'
      )
      return
    }
    if (!confirm(`Excluir ${vendedor.nome}?`)) return

    setErro('')
    try {
      await removerVendedor(vendedor.id)
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível excluir o vendedor.'))
    }
  }

  async function fechar(resumo) {
    const quantas = rifasParaFecharMeta(resumo.faltante, config.precoRifa)
    const confirmacao =
      `${resumo.vendedor.nome} arrecadou ${formatarMoeda(resumo.total)} de ` +
      `${formatarMoeda(resumo.meta)}.\n\n` +
      `Registrar ${quantas} rifa(s) no nome dele, totalizando ` +
      `${formatarMoeda(quantas * config.precoRifa)}?\n\n` +
      'São rifas de verdade: entram no sorteio e no CSV.'
    if (!confirm(confirmacao)) return

    setErro('')
    setOcupado(resumo.vendedor.id)
    try {
      await fecharMeta(resumo.vendedor.id)
    } catch (e) {
      setErro(traduzirErro(e, 'Não foi possível fechar a meta.'))
    } finally {
      setOcupado('')
    }
  }

  return (
    <>
      <div className="section-head">
        <h2>Vendedores ({vendedores.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-sm"
            onClick={() => baixarCsvDeVendedores(vendedores, vendas, config, dadosPrivados)}
            disabled={vendedores.length === 0}
          >
            Exportar CSV
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => setEmEdicao('novo')}>
            + Adicionar
          </button>
        </div>
      </div>

      {erro && <p className="error-text">{erro}</p>}

      {vendedores.length === 0 ? (
        <EstadoVazio icone="👤">
          <p>Nenhum vendedor cadastrado.</p>
          <p>Cadastre com o e-mail de cada um para que possam entrar.</p>
        </EstadoVazio>
      ) : (
        <div className="card">
          {vendedores.map((vendedor) => {
            const resumo = resumoDoVendedor(vendedor, vendas, config)
            const temTermo =
              Boolean(dadosPrivados[vendedor.id]?.termoPath) || Boolean(vendedor.termoDigitalEm)
            const podeFechar = vendedor.situacao !== 'desistiu' && resumo.faltante > 0

            return (
              <div key={vendedor.id} className={estilos.linha}>
                <div className={estilos.info}>
                  <div className={estilos.nome}>
                    {vendedor.nome}
                    <EtiquetaSituacao situacao={vendedor.situacao} />
                    {vendedor.tipo === 'voluntario' && <span className="tag">Voluntário</span>}
                    {!temTermo && <span className={estilos.alerta}>sem termo</span>}
                    {!vendedor.temSenha && <span className={estilos.alerta}>não entrou ainda</span>}
                  </div>
                  <div className={estilos.detalhe}>
                    {vendedor.email}
                    {vendedor.telefone && ` · ${vendedor.telefone}`}
                  </div>
                  <div className={estilos.detalhe}>
                    {formatarMoeda(resumo.total)} de {formatarMoeda(resumo.meta)} ·{' '}
                    {resumo.quantidade} rifas
                    {resumo.quantidadePropria > 0 && ` (${resumo.quantidadePropria} próprias)`}
                  </div>
                  {podeFechar && (
                    <div className={estilos.faltante}>
                      faltam {formatarMoeda(resumo.faltante)} ·{' '}
                      {rifasParaFecharMeta(resumo.faltante, config.precoRifa)} rifas
                    </div>
                  )}
                </div>

                <div className={estilos.acoes}>
                  <button className="btn btn-sm" onClick={() => setVendoVendasDe(vendedor)}>
                    Ver vendas
                  </button>
                  {podeFechar && (
                    <button
                      className="btn btn-sm"
                      onClick={() => fechar(resumo)}
                      disabled={ocupado === vendedor.id}
                    >
                      {ocupado === vendedor.id ? '…' : 'Fechar meta'}
                    </button>
                  )}
                  <button className="btn-ghost btn-sm" onClick={() => setEmEdicao(vendedor)}>
                    Editar
                  </button>
                  <button className="btn-ghost btn-sm btn-danger" onClick={() => excluir(vendedor)}>
                    Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {emEdicao && (
        <ModalVendedor
          vendedor={emEdicao === 'novo' ? null : emEdicao}
          aoFechar={() => setEmEdicao(null)}
        />
      )}

      {vendoVendasDe && (
        <ModalVendasDoVendedor
          vendedor={vendoVendasDe}
          aoFechar={() => setVendoVendasDe(null)}
        />
      )}
    </>
  )
}
