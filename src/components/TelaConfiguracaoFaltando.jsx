/**
 * Aparece quando o .env.local não foi criado ou está incompleto.
 * Sem as credenciais o app não consegue falar com o banco.
 */
export default function TelaConfiguracaoFaltando() {
  return (
    <div className="card" style={{ marginTop: 40 }}>
      <h2>Falta configurar o Supabase</h2>
      <p className="texto-ajuda">
        O app não encontrou as credenciais do banco de dados. Para resolver:
      </p>
      <ol style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)', paddingLeft: 20 }}>
        <li>
          Copie o arquivo <code>.env.example</code> para <code>.env.local</code>
        </li>
        <li>
          Preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> com os
          dados do seu projeto (painel do Supabase → Project Settings → API)
        </li>
        <li>
          Pare o servidor e rode <code>npm run dev</code> de novo
        </li>
      </ol>
    </div>
  )
}
