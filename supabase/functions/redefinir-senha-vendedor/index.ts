// Edge Function: líder redefine a senha de um vendedor direto no sistema,
// sem precisar mandar e-mail nenhum. Roda no servidor do Supabase, nunca no
// navegador — é aqui, e só aqui, que a service_role pode existir.
//
// Deploy: supabase functions deploy redefinir-senha-vendedor

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

Deno.serve(async (req) => {
  try {
    const { vendedorId, novaSenha } = await req.json()
    if (!vendedorId || !novaSenha) {
      return new Response(JSON.stringify({ error: 'Faltou vendedorId ou novaSenha.' }), { status: 400 })
    }
    if (String(novaSenha).length < 6) {
      return new Response(JSON.stringify({ error: 'A senha precisa ter pelo menos 6 letras ou números.' }), {
        status: 400,
      })
    }

    // confere que quem chamou é líder, usando o token de quem chamou
    const autorizacao = req.headers.get('Authorization') || ''
    const clienteDoUsuario = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: autorizacao } },
    })
    const { data: eLider } = await clienteDoUsuario.rpc('e_lider')
    const { data: meuGrupo } = await clienteDoUsuario.rpc('meu_grupo')
    const { data: souDev } = await clienteDoUsuario.rpc('e_dev')
    if (!eLider) {
      return new Response(JSON.stringify({ error: 'Sem permissão.' }), { status: 403 })
    }

    // com a service_role a partir daqui: ignora RLS de propósito, pra achar
    // o vendedor e confirmar que ele é do grupo desse líder
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: vendedor, error: erroVendedor } = await admin
      .from('vendedores')
      .select('id, grupo, user_id')
      .eq('id', vendedorId)
      .maybeSingle()

    if (erroVendedor || !vendedor) {
      return new Response(JSON.stringify({ error: 'Vendedor não encontrado.' }), { status: 404 })
    }
    if (!souDev && meuGrupo !== vendedor.grupo) {
      return new Response(JSON.stringify({ error: 'Sem permissão.' }), { status: 403 })
    }
    if (!vendedor.user_id) {
      return new Response(JSON.stringify({ error: 'Esse vendedor ainda não criou o acesso dele.' }), {
        status: 400,
      })
    }

    const { error: erroSenha } = await admin.auth.admin.updateUserById(vendedor.user_id, {
      password: novaSenha,
    })
    if (erroSenha) {
      return new Response(JSON.stringify({ error: erroSenha.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (erro) {
    return new Response(JSON.stringify({ error: String(erro) }), { status: 500 })
  }
})
