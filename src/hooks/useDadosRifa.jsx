import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG_PADRAO, listarConfigs, mapearConfig, salvarConfig } from '../lib/db/config'
import {
  atualizarVendedor,
  criarVendedor,
  excluirVendedor,
  listarVendedores,
  mapearVendedor,
} from '../lib/db/vendedores'
import {
  atualizarRepasseVenda,
  atualizarStatusVenda,
  completarLote,
  corrigirVenda,
  excluirVenda,
  listarVendas,
  mapearVenda,
  registrarVenda,
} from '../lib/db/vendas'
import { listarSorteios, registrarSorteio } from '../lib/db/sorteios'
import { listarDadosPrivados, salvarDadosPrivados } from '../lib/db/vendedoresPrivado'
import { apagarDadosDoGrupo, fecharMetaDoVendedor, transferirVendas } from '../lib/db/fechamento'
import { traduzirErro } from '../lib/db/erros'
import { useSessao } from './useSessao'

/**
 * Os dados do grupo de quem está logado.
 *
 * Nada aqui filtra por grupo: quem filtra é o banco. Se um líder do Alpha
 * pedir "todas as vendas", o Postgres devolve só as do Alpha. Isso mantém a
 * separação verdadeira mesmo que alguém mexa no código da tela.
 */

const DadosContexto = createContext(null)

function mesclar(lista, item) {
  const indice = lista.findIndex((i) => i.id === item.id)
  if (indice === -1) return [...lista, item]
  const copia = lista.slice()
  copia[indice] = item
  return copia
}

const remover = (lista, id) => lista.filter((i) => i.id !== id)

export function ProvedorDadosRifa({ children }) {
  const { temAcesso, grupo, vendedorId, eLider } = useSessao()

  // Guardamos tudo que o banco devolveu. Para líder e vendedor isso já é só o
  // grupo deles; para o dev vêm os dois, e o filtro por grupoAtivo acontece
  // logo abaixo — é o que faz o painel do dev não somar Alpha com Kombo.
  const [configsPorGrupo, setConfigsPorGrupo] = useState({})
  const [todosVendedores, setTodosVendedores] = useState([])
  const [todasVendas, setTodasVendas] = useState([])
  const [todosSorteios, setTodosSorteios] = useState([])
  const [dadosPrivados, setDadosPrivados] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState('')

  const jaCarregou = useRef(false)

  const carregarTudo = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!temAcesso) {
        setCarregando(false)
        return
      }
      if (!silencioso) setCarregando(true)
      try {
        const [cfgs, vds, vs, srt, priv] = await Promise.all([
          listarConfigs(),
          listarVendedores(),
          listarVendas(),
          listarSorteios(),
          eLider ? listarDadosPrivados() : Promise.resolve({}),
        ])
        setConfigsPorGrupo(cfgs)
        setTodosVendedores(vds)
        setTodasVendas(vs)
        setTodosSorteios(srt)
        setDadosPrivados(priv)
        setErroCarregamento('')
        jaCarregou.current = true
      } catch (erro) {
        if (!jaCarregou.current) {
          setErroCarregamento(traduzirErro(erro, 'Não foi possível carregar os dados.'))
        }
      } finally {
        if (!silencioso) setCarregando(false)
      }
    },
    [temAcesso, eLider]
  )

  useEffect(() => {
    carregarTudo()
  }, [carregarTudo])

  // ---- Realtime -----------------------------------------------------------
  useEffect(() => {
    if (!temAcesso) return undefined

    const canal = supabase
      .channel('rifas-' + (grupo || 'todos'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, (payload) => {
        if (payload.eventType === 'DELETE') setTodasVendas((a) => remover(a, payload.old.id))
        else setTodasVendas((a) => mesclar(a, mapearVenda(payload.new)))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendedores' }, (payload) => {
        if (payload.eventType === 'DELETE') setTodosVendedores((a) => remover(a, payload.old.id))
        else setTodosVendedores((a) => mesclar(a, mapearVendedor(payload.new)))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, (payload) => {
        if (payload.new) {
          setConfigsPorGrupo((a) => ({ ...a, [payload.new.grupo]: mapearConfig(payload.new) }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [temAcesso, grupo])

  // Celular derruba a conexão quando a tela apaga: recarrega ao voltar.
  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState === 'visible') carregarTudo({ silencioso: true })
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [carregarTudo])

  // Tudo que as telas enxergam é do grupo em uso. Para líder e vendedor o
  // filtro não muda nada (o banco já entregou só o grupo deles); para o dev é
  // o que separa um evento do outro.
  const config = configsPorGrupo[grupo] || CONFIG_PADRAO
  const vendedores = useMemo(
    () => todosVendedores.filter((v) => v.grupo === grupo),
    [todosVendedores, grupo]
  )
  const vendas = useMemo(
    () => todasVendas.filter((v) => v.grupo === grupo),
    [todasVendas, grupo]
  )
  const sorteios = useMemo(
    () => todosSorteios.filter((s) => s.grupo === grupo),
    [todosSorteios, grupo]
  )

  const valor = useMemo(
    () => ({
      config,
      vendedores,
      vendas,
      sorteios,
      dadosPrivados,
      carregando,
      erroCarregamento,
      recarregar: carregarTudo,

      buscarVendedor: (id) => vendedores.find((v) => v.id === id) || null,
      buscarDadosPrivados: (id) =>
        dadosPrivados[id] || { vendedorId: id, observacao: '', termoPath: '', termoAssinadoEm: '' },
      /** O vendedor logado, quando quem está usando é um vendedor. */
      meuCadastro: vendedores.find((v) => v.id === vendedorId) || null,

      async salvarAjustes(mudancas) {
        const salva = await salvarConfig(grupo, mudancas)
        setConfigsPorGrupo((a) => ({ ...a, [grupo]: salva }))
      },

      async adicionarVendedor(dados) {
        const novo = await criarVendedor({ ...dados, grupo })
        setTodosVendedores((a) => mesclar(a, novo))
        return novo
      },

      async editarVendedor(id, dados) {
        const atualizado = await atualizarVendedor(id, dados)
        setTodosVendedores((a) => mesclar(a, atualizado))
      },

      async removerVendedor(id) {
        await excluirVendedor(id)
        setTodosVendedores((a) => remover(a, id))
        setDadosPrivados((a) => {
          const copia = { ...a }
          delete copia[id]
          return copia
        })
      },

      async salvarPrivadoDoVendedor(id, dados) {
        const salvo = await salvarDadosPrivados(id, dados)
        setDadosPrivados((a) => ({ ...a, [id]: salvo }))
        return salvo
      },

      /** Registra de 1 a 50 rifas de uma vez. Devolve as rifas criadas. */
      async registrarCompra(dados) {
        const criadas = await registrarVenda(dados)
        setTodasVendas((atual) => criadas.reduce(mesclar, atual))
        return criadas
      },

      async mudarStatusVenda(id, status) {
        const atualizada = await atualizarStatusVenda(id, status)
        setTodasVendas((a) => mesclar(a, atualizada))
      },

      async mudarRepasseVenda(id, repasse) {
        const atualizada = await atualizarRepasseVenda(id, repasse)
        setTodasVendas((a) => mesclar(a, atualizada))
      },

      /** O vendedor completa a própria compra: status e/ou comprovante. */
      async completarCompra(loteId, dados) {
        const atualizadas = await completarLote(loteId, dados)
        setTodasVendas((atual) => atualizadas.reduce(mesclar, atual))
        return atualizadas
      },

      async removerVenda(id) {
        await excluirVenda(id)
        setTodasVendas((a) => remover(a, id))
      },

      async corrigirDadosDaVenda(id, dados) {
        const atualizada = await corrigirVenda(id, dados)
        setTodasVendas((a) => mesclar(a, atualizada))
        return atualizada
      },

      async fecharMeta(id, pagamento) {
        const criadas = await fecharMetaDoVendedor(id, pagamento)
        await carregarTudo({ silencioso: true })
        return criadas
      },

      async passarVendasPara(deId, paraId) {
        const total = await transferirVendas(deId, paraId)
        await carregarTudo({ silencioso: true })
        return total
      },

      async salvarSorteio(vendaId) {
        const novo = await registrarSorteio({ grupo, vendaId })
        setTodosSorteios((a) => [novo, ...a])
      },

      /** Apaga só o grupo em uso; o outro fica intacto. */
      async apagarTudo() {
        await apagarDadosDoGrupo(grupo)
        setTodosVendedores((a) => a.filter((v) => v.grupo !== grupo))
        setTodasVendas((a) => a.filter((v) => v.grupo !== grupo))
        setTodosSorteios((a) => a.filter((s) => s.grupo !== grupo))
        setDadosPrivados({})
      },
    }),
    [
      config, vendedores, vendas, sorteios, dadosPrivados,
      carregando, erroCarregamento, carregarTudo, grupo, vendedorId,
    ]
  )

  return <DadosContexto.Provider value={valor}>{children}</DadosContexto.Provider>
}

export function useDadosRifa() {
  const contexto = useContext(DadosContexto)
  if (!contexto) throw new Error('useDadosRifa precisa estar dentro de <ProvedorDadosRifa>.')
  return contexto
}
