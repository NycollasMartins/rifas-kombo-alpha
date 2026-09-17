// Edge Function: dispara notificação push de verdade para os vendedores de
// um grupo. Roda no servidor do Supabase, nunca no navegador — é aqui, e só
// aqui, que a chave privada do VAPID pode existir.
//
// Deploy: supabase functions deploy notificar-vendedores
// Secrets (uma vez só):
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:voce@email.com

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@rifasacampamento.tech',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const { grupo, titulo, corpo } = await req.json()
    if (!grupo || !titulo) {
      return new Response(JSON.stringify({ error: 'Faltou grupo ou título.' }), { status: 400 })
    }

    // confere que quem chamou é líder daquele grupo, usando o token de quem chamou
    const autorizacao = req.headers.get('Authorization') || ''
    const clienteDoUsuario = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: autorizacao } },
    })
    const { data: eLider } = await clienteDoUsuario.rpc('e_lider')
    const { data: meuGrupo } = await clienteDoUsuario.rpc('meu_grupo')
    const { data: souDev } = await clienteDoUsuario.rpc('e_dev')
    if (!eLider || (!souDev && meuGrupo !== grupo)) {
      return new Response(JSON.stringify({ error: 'Sem permissão.' }), { status: 403 })
    }

    // com a service_role a partir daqui: ignora RLS de propósito, pra ler
    // as inscrições de todo mundo do grupo
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: vendedores } = await admin.from('vendedores').select('id').eq('grupo', grupo)
    const idsVendedores = (vendedores || []).map((v) => v.id)
    if (idsVendedores.length === 0) return new Response(JSON.stringify({ enviadas: 0 }))

    const { data: inscricoes } = await admin
      .from('inscricoes_push')
      .select('endpoint, p256dh, auth')
      .in('vendedor_id', idsVendedores)

    const payload = JSON.stringify({ titulo, corpo: corpo || '' })
    let enviadas = 0

    await Promise.all(
      (inscricoes || []).map(async (i) => {
        try {
          await webpush.sendNotification(
            { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
            payload
          )
          enviadas++
        } catch (erro) {
          // inscrição vencida/inválida (usuário desinstalou etc.) — remove e segue
          if (erro?.statusCode === 404 || erro?.statusCode === 410) {
            await admin.from('inscricoes_push').delete().eq('endpoint', i.endpoint)
          }
        }
      })
    )

    return new Response(JSON.stringify({ enviadas }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (erro) {
    return new Response(JSON.stringify({ error: String(erro) }), { status: 500 })
  }
})
