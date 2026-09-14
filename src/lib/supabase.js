import { createClient } from '@supabase/supabase-js'

/**
 * Cliente do Supabase.
 *
 * As credenciais vêm do arquivo .env.local (veja .env.example).
 * A chave "anon" é pública por natureza — ela vai junto no site publicado e
 * isso é esperado. Quem protege os dados são as regras de acesso (RLS)
 * definidas em supabase/schema.sql, não o sigilo dessa chave.
 * A chave "service_role" NUNCA deve entrar neste projeto.
 */

const url = import.meta.env.VITE_SUPABASE_URL
const chaveAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && chaveAnon)

const CHAVE_LEMBRAR = 'rifas-lembrar-login'

function lembrarLogin() {
  try {
    return localStorage.getItem(CHAVE_LEMBRAR) !== 'false'
  } catch {
    return true
  }
}

/**
 * Chamado antes de entrar/criar conta: decide se a sessão fica guardada no
 * localStorage (sobrevive a fechar o navegador) ou só no sessionStorage
 * (some ao fechar a aba). O padrão é "lembrar" — igual ao comportamento de
 * sempre — para não pegar ninguém desprevenido.
 */
export function definirLembrarLogin(lembrar) {
  try {
    localStorage.setItem(CHAVE_LEMBRAR, lembrar ? 'true' : 'false')
  } catch {
    // navegador sem armazenamento: a sessão vale só para esta aba
  }
}

/** Guarda a sessão em localStorage ou sessionStorage, conforme "Lembrar de mim". */
const armazenamentoDaSessao = {
  getItem(chave) {
    try {
      return (lembrarLogin() ? localStorage : sessionStorage).getItem(chave)
    } catch {
      return null
    }
  },
  setItem(chave, valor) {
    try {
      ;(lembrarLogin() ? localStorage : sessionStorage).setItem(chave, valor)
    } catch {
      // sem armazenamento disponível: a sessão não sobrevive a um recarregar
    }
  },
  removeItem(chave) {
    try {
      localStorage.removeItem(chave)
      sessionStorage.removeItem(chave)
    } catch {
      // nada a fazer
    }
  },
}

export const supabase = supabaseConfigurado
  ? createClient(url, chaveAnon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: armazenamentoDaSessao,
      },
    })
  : null
