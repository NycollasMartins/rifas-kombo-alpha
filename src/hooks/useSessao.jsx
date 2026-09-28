import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { definirLembrarLogin, supabase } from '../lib/supabase'
import { traduzirErro } from '../lib/db/erros'
import {
  meuGrupo,
  meuPapel,
  meuVendedorId,
  podeCorrigirVenda,
  registrarLider,
  vincularVendedor,
} from '../lib/db/entrada'
import { ALPHA, aplicarTemaDoGrupo, grupoValido } from '../utils/grupos'

/**
 * Quem está usando o app.
 *
 * Todo mundo faz login — líder e vendedor. O que cada um pode fazer, e de
 * qual grupo, vem do banco a cada entrada; nada disso fica guardado no
 * navegador, onde qualquer um poderia editar.
 *
 * papel: 'dev' | 'lider' | 'vendedor' | 'sem_acesso' | 'anonimo'
 */

const SessaoContexto = createContext(null)

const SEM_ACESSO = { papel: 'anonimo', grupo: null, vendedorId: null }
const CHAVE_GRUPO_DO_DEV = 'rifas-grupo-do-dev'

/** O dev não pertence a um grupo: ele escolhe qual está olhando no momento. */
function lerGrupoDoDev() {
  try {
    const guardado = localStorage.getItem(CHAVE_GRUPO_DO_DEV)
    return grupoValido(guardado) ? guardado : ALPHA
  } catch {
    return ALPHA
  }
}

export function ProvedorSessao({ children }) {
  const [sessao, setSessao] = useState(null)
  const [acesso, setAcesso] = useState(SEM_ACESSO)
  const [verificando, setVerificando] = useState(true)
  const [recuperandoSenha, setRecuperandoSenha] = useState(false)
  const [grupoDoDev, setGrupoDoDev] = useState(lerGrupoDoDev)

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setSessao(data.session)
    })

    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, nova) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoSenha(true)
      setSessao(nova)
    })

    return () => {
      ativo = false
      assinatura.subscription.unsubscribe()
    }
  }, [])

  /** Pergunta ao banco quem é essa pessoa. */
  const carregarAcesso = useCallback(async () => {
    const papel = await meuPapel()
    if (papel === 'sem_acesso') return { ...SEM_ACESSO, papel }
    const [grupo, vendedorId, corrigirVenda] = await Promise.all([
      meuGrupo(),
      meuVendedorId(),
      podeCorrigirVenda(),
    ])
    return { papel, grupo, vendedorId, podeCorrigirVenda: corrigirVenda }
  }, [])

  useEffect(() => {
    let ativo = true

    if (!sessao) {
      setAcesso(SEM_ACESSO)
      setVerificando(false)
      return undefined
    }

    setVerificando(true)
    carregarAcesso()
      .then((a) => ativo && setAcesso(a))
      .catch(() => ativo && setAcesso({ ...SEM_ACESSO, papel: 'sem_acesso' }))
      .finally(() => ativo && setVerificando(false))

    return () => {
      ativo = false
    }
  }, [sessao, carregarAcesso])

  const eDev = acesso.papel === 'dev'

  // Líder e vendedor têm um grupo fixo. O dev usa o que escolheu no topo.
  const grupoAtivo = eDev ? grupoDoDev : acesso.grupo

  // A cor do app segue o grupo que está sendo olhado.
  useEffect(() => {
    aplicarTemaDoGrupo(grupoAtivo)
  }, [grupoAtivo])

  const valor = useMemo(
    () => ({
      ...acesso,
      // "grupo" é sempre o que está em uso agora — para o dev, o que ele escolheu
      grupo: grupoAtivo,
      email: sessao?.user?.email || '',
      estaLogado: Boolean(sessao),
      temAcesso: ['dev', 'lider', 'vendedor'].includes(acesso.papel),
      eDev,
      podeCorrigirVenda: eDev || Boolean(acesso.podeCorrigirVenda),
      eLider: acesso.papel === 'dev' || acesso.papel === 'lider',
      eVendedor: acesso.papel === 'vendedor',
      verificando,
      recuperandoSenha,

      /** Só o dev troca de grupo; para os outros não faz nada. */
      trocarDeGrupo(novo) {
        if (!eDev || !grupoValido(novo)) return
        setGrupoDoDev(novo)
        try {
          localStorage.setItem(CHAVE_GRUPO_DO_DEV, novo)
        } catch {
          // navegador sem armazenamento: vale só nesta sessão
        }
      },

      async entrar(email, senha, lembrar = true) {
        definirLembrarLogin(lembrar)
        const { error } = await supabase.auth.signInWithPassword({
          email: String(email).trim().toLowerCase(),
          password: senha,
        })
        if (error) return { ok: false, erro: traduzirErro(error, 'Não foi possível entrar.') }
        return { ok: true, erro: '' }
      },

      /**
       * Cria a conta de líder: primeiro o e-mail e a senha, depois o código do
       * grupo. Se a conta já existir, entra e só apresenta o código — assim
       * quem errou o código na primeira vez consegue tentar de novo.
       */
      async criarContaDeLider({ nome, email, senha, grupo, codigo, lembrar = true }) {
        definirLembrarLogin(lembrar)
        const limpo = String(email).trim().toLowerCase()
        const { error } = await supabase.auth.signUp({
          email: limpo,
          password: senha,
          options: { data: { nome } },
        })

        if (error) {
          const jaExiste = String(error.message || '').includes('already registered')
          if (!jaExiste) {
            return { ok: false, erro: traduzirErro(error, 'Não foi possível criar a conta.') }
          }
          const entrada = await supabase.auth.signInWithPassword({ email: limpo, password: senha })
          if (entrada.error) {
            return {
              ok: false,
              erro: 'Este e-mail já tem conta, e a senha não confere. Use "Já tenho conta".',
            }
          }
        }

        try {
          await registrarLider(grupo, codigo, nome)
        } catch (e) {
          return { ok: false, erro: e.message }
        }

        setAcesso(await carregarAcesso())
        return { ok: true, erro: '' }
      },

      /** Primeiro acesso do vendedor: ele escolhe a senha dele. */
      async criarSenhaDeVendedor({ email, senha, lembrar = true }) {
        definirLembrarLogin(lembrar)
        const limpo = String(email).trim().toLowerCase()
        const { error } = await supabase.auth.signUp({ email: limpo, password: senha })

        if (error) {
          return { ok: false, erro: traduzirErro(error, 'Não foi possível criar a senha.') }
        }

        try {
          await vincularVendedor()
        } catch (e) {
          return { ok: false, erro: e.message }
        }

        setAcesso(await carregarAcesso())
        return { ok: true, erro: '' }
      },

      /** Chamado quando alguém entra mas ainda não tem papel nenhum. */
      async tentarVincular() {
        try {
          await vincularVendedor()
          setAcesso(await carregarAcesso())
          return { ok: true, erro: '' }
        } catch (e) {
          return { ok: false, erro: e.message }
        }
      },

      async pedirRecuperacaoDeSenha(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          String(email).trim().toLowerCase(),
          { redirectTo: window.location.origin }
        )
        if (error) {
          return { ok: false, erro: traduzirErro(error, 'Não foi possível enviar o e-mail.') }
        }
        return { ok: true, erro: '' }
      },

      async trocarSenha(novaSenha) {
        const { error } = await supabase.auth.updateUser({ password: novaSenha })
        if (error) {
          return { ok: false, erro: traduzirErro(error, 'Não foi possível trocar a senha.') }
        }
        setRecuperandoSenha(false)
        return { ok: true, erro: '' }
      },

      async sair() {
        await supabase.auth.signOut()
        setAcesso(SEM_ACESSO)
        setRecuperandoSenha(false)
      },
    }),
    [acesso, sessao, verificando, recuperandoSenha, carregarAcesso, eDev, grupoAtivo]
  )

  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>
}

export function useSessao() {
  const contexto = useContext(SessaoContexto)
  if (!contexto) throw new Error('useSessao precisa estar dentro de <ProvedorSessao>.')
  return contexto
}
