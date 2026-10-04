import { createRoot } from 'react-dom/client'
import App from './App'
import FormularioInscricaoPublico from './components/FormularioInscricaoPublico'
import TelaConfiguracaoFaltando from './components/TelaConfiguracaoFaltando'
import { ProvedorSessao } from './hooks/useSessao'
import { ProvedorDadosRifa } from './hooks/useDadosRifa'
import { supabaseConfigurado } from './lib/supabase'
import { registrarServiceWorker } from './utils/instalacao'
import { GRUPOS } from './utils/grupos'
import './styles/global.css'

// destrava o botão "Instalar" no Android; não guarda nada em cache
registrarServiceWorker()

const raiz = createRoot(document.getElementById('root'))

// Formulário público (QR code): /inscricao/alpha ou /inscricao/kombo — sem
// login, nem o resto do app carrega. Ver FormularioInscricaoPublico.jsx.
const partesDoCaminho = window.location.pathname.split('/').filter(Boolean)
const grupoPublico =
  partesDoCaminho[0] === 'inscricao' &&
  GRUPOS.find((g) => g.toLowerCase() === (partesDoCaminho[1] || '').toLowerCase())

raiz.render(
  !supabaseConfigurado ? (
    <TelaConfiguracaoFaltando />
  ) : grupoPublico ? (
    <FormularioInscricaoPublico grupo={grupoPublico} />
  ) : (
    <ProvedorSessao>
      <ProvedorDadosRifa>
        <App />
      </ProvedorDadosRifa>
    </ProvedorSessao>
  )
)
