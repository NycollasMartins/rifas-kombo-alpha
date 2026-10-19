import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { definirLembrarLogin, supabase } from '../lib/supabase'
import { traduzirErro } from '../lib/db/erros'
import {
  meuGrupo,
  meuPapel,
  meuVendedorId,
  podeCorrigirVenda,
  registrarLider,
  redefinirSenhaDeVendedor,
  registrarVendedorAutonomo,
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
const CHAVE_PAPEL_DESEJADO = 'rifas-papel-desejado'
const CHAVE_GRUPO_DESEJADO = 'rifas-grupo-desejado'

/** O dev não pertence a um grupo: ele escolhe qual está olhando no momento. */
function lerGrupoDoDev() {
  try {
    const guardado = localStorage.getItem(CHAVE_GRUPO_DO_DEV)
    return grupoValido(guardado) ? guardado : ALPHA
  } catch {
    return ALPHA
  }
}

/** Por qual porta a pessoa escolheu entrar — líder ou vendedor(a). */
function lerPapelDesejado() {
  try {
    const guardado = localStorage.getItem(CHAVE_PAPEL_DESEJADO)
    return guardado === 'lider' || guardado === 'vendedor' ? guardado : null
  } catch {
    return null
  }
}

/**
 * De qual grupo é o vendedor(a) escolhido — só importa pra quem tem o
 * mesmo e-mail cadastrado como vendedor(a) em mais de um grupo (login
 * único); nos outros casos o backend resolve sozinho.
 */
function lerGrupoDesejado() {
  try {
    const guardado = localStorage.getItem(CHAVE_GRUPO_DESEJADO)
    return grupoValido(guardado) ? guardado : null
  } catch {
    return null
  }
}

export function ProvedorSessao({ children }) {
  const [sessao, setSessao] = useState(null)
  const [acesso, setAcesso] = useState(SEM_ACESSO)
  const [verificando, setVerificando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [recuperandoSenha, setRecuperandoSenha] = useState(false)
  const [grupoDoDev, setGrupoDoDev] = useState(lerGrupoDoDev)
  const [papelDesejado, setPapelDesejado] = useState(lerPapelDesejado)
  const [grupoDesejado, setGrupoDesejado] = useState(lerGrupoDesejado)

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

  /**
   * Pergunta ao banco quem é essa pessoa. Quando a mesma conta tem perfil de
   * líder e de vendedor(a), `papelDesejado` (a porta por onde ela escolheu
   * entrar) decide qual dos dois vale agora.
   */
  const carregarAcesso = useCallback(async () => {
    const papel = await meuPapel(papelDesejado, grupoDesejado)
    if (papel === 'sem_acesso') return { ...SEM_ACESSO, papel }
    const [grupo, vendedorId, corrigirVenda] = await Promise.all([
      meuGrupo(papelDesejado, grupoDesejado),
      meuVendedorId(papelDesejado, grupoDesejado),
      podeCorrigirVenda(papelDesejado, grupoDesejado),
    ])
    return { papel, grupo, vendedorId, podeCorrigirVenda: corrigirVenda }
  }, [papelDesejado, grupoDesejado])

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
      processando,
      recuperandoSenha,
      papelDesejado,
      grupoDesejado,

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

      /**
       * Escolhe a porta de entrada: líder ou vendedor(a) (ou volta pra tela
       * inicial, passando `null`). Pra vendedor(a), também recebe de qual
       * grupo — necessário pra desambiguar quando o mesmo e-mail é
       * vendedor(a) em mais de um grupo (login único).
       */
      escolherPorta(novoPapel, novoGrupo = null) {
        setPapelDesejado(novoPapel)
        setGrupoDesejado(novoPapel === 'vendedor' ? novoGrupo : null)
        try {
          if (novoPapel) localStorage.setItem(CHAVE_PAPEL_DESEJADO, novoPapel)
          else localStorage.removeItem(CHAVE_PAPEL_DESEJADO)
          if (novoPapel === 'vendedor' && novoGrupo) {
            localStorage.setItem(CHAVE_GRUPO_DESEJADO, novoGrupo)
          } else {
            localStorage.removeItem(CHAVE_GRUPO_DESEJADO)
          }
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
        setProcessando(true)
        try {
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
        } finally {
          setProcessando(false)
        }
      },

      /** Autocadastro: a pessoa cria a própria conta E o próprio cadastro de vendedor. */
      async cadastrarVendedor({
        nome,
        email,
        telefone,
        tipo,
        destino,
        grupo,
        codigo,
        senha,
        lembrar = true,
      }) {
        definirLembrarLogin(lembrar)
        setProcessando(true)
        // garante que carregarAcesso(), logo abaixo, resolva pro grupo certo
        // mesmo que a tela não tenha chamado escolherPorta antes
        setGrupoDesejado(grupo)
        try {
          const limpo = String(email).trim().toLowerCase()
          const { error } = await supabase.auth.signUp({ email: limpo, password: senha })

          if (error) {
            // conta já existe — provável sobra de uma tentativa anterior que
            // criou o login mas não terminou de vincular (código errado etc).
            // Em vez de travar, entra com ela e tenta vincular de novo.
            const jaExiste = String(error.message || '').includes('already registered')
            if (!jaExiste) {
              return { ok: false, erro: traduzirErro(error, 'Não foi possível criar a conta.') }
            }
            const entrada = await supabase.auth.signInWithPassword({ email: limpo, password: senha })
            if (entrada.error) {
              return {
                ok: false,
                erro: 'Este e-mail já tem conta, e a senha não confere. Use "Já tenho senha".',
              }
            }
          }
          try {
            await registrarVendedorAutonomo({
              grupo,
              codigo,
              nome,
              email: limpo,
              telefone,
              tipo,
              destino,
            })
          } catch (e) {
            // não deixa a pessoa "logada sem acesso": sem isso, a tela trocava
            // sozinha pra "sua conta ainda não tem acesso" antes dela sequer
            // ler o erro (ex: código errado), e a tentativa seguinte esbarrava
            // num cadastro pela metade
            await supabase.auth.signOut()
            return { ok: false, erro: e.message }
          }
          setAcesso(await carregarAcesso())
          return { ok: true, erro: '' }
        } finally {
          setProcessando(false)
        }
      },

      /** Primeiro acesso do vendedor: ele escolhe a senha dele. */
      async criarSenhaDeVendedor({ email, senha, lembrar = true }) {
        definirLembrarLogin(lembrar)
        setProcessando(true)
        try {
          const limpo = String(email).trim().toLowerCase()
          const { error } = await supabase.auth.signUp({ email: limpo, password: senha })

          if (error) {
            return { ok: false, erro: traduzirErro(error, 'Não foi possível criar a senha.') }
          }

          try {
            await vincularVendedor(grupoDesejado)
          } catch (e) {
            await supabase.auth.signOut()
            return { ok: false, erro: e.message }
          }

          setAcesso(await carregarAcesso())
          return { ok: true, erro: '' }
        } finally {
          setProcessando(false)
        }
      },

      /** Chamado quando alguém entra mas ainda não tem papel nenhum. */
      async tentarVincular() {
        setProcessando(true)
        try {
          await vincularVendedor(grupoDesejado)
          setAcesso(await carregarAcesso())
          return { ok: true, erro: '' }
        } catch (e) {
          return { ok: false, erro: e.message }
        } finally {
          setProcessando(false)
        }
      },

      /** Líder redefine a senha de um vendedor direto no app, sem e-mail. */
      async redefinirSenhaDoVendedor(vendedorId, novaSenha) {
        try {
          await redefinirSenhaDeVendedor(vendedorId, novaSenha)
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
        setPapelDesejado(null)
        setGrupoDesejado(null)
        try {
          localStorage.removeItem(CHAVE_PAPEL_DESEJADO)
          localStorage.removeItem(CHAVE_GRUPO_DESEJADO)
        } catch {
          // navegador sem armazenamento: vale só nesta sessão
        }
      },
    }),
    [
      acesso,
      sessao,
      verificando,
      processando,
      recuperandoSenha,
      papelDesejado,
      grupoDesejado,
      carregarAcesso,
      eDev,
      grupoAtivo,
    ]
  )

  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>
}

export function useSessao() {
  const contexto = useContext(SessaoContexto)
  if (!contexto) throw new Error('useSessao precisa estar dentro de <ProvedorSessao>.')
  return contexto
}
