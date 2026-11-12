import { createRoot } from 'react-dom/client'
import App from './App'
import TelaApadrinhar from './components/apadrinhamento/TelaApadrinhar'
import TelaConfiguracaoFaltando from './components/TelaConfiguracaoFaltando'
import { ProvedorSessao } from './hooks/useSessao'
import { ProvedorDadosRifa } from './hooks/useDadosRifa'
import { supabaseConfigurado } from './lib/supabase'
import { registrarServiceWorker } from './utils/instalacao'
import { observarNovaVersao } from './utils/atualizacoes'
import './styles/global.css'

// destrava o botão "Instalar" no Android; não guarda nada em cache
registrarServiceWorker()

// detecta sozinho quando sai uma versão nova e recarrega a página
observarNovaVersao()

const raiz = createRoot(document.getElementById('root'))

// /apadrinhar é pública de propósito — sem login, sem conta — por isso
// nasce FORA de ProvedorSessao/ProvedorDadosRifa, que pressupõem alguém já
// identificado. Sem biblioteca de rotas: é a única tela que não faz parte
// da máquina de estados de App.jsx.
const ehApadrinhamento = window.location.pathname.startsWith('/apadrinhar')

raiz.render(
  !supabaseConfigurado ? (
    <TelaConfiguracaoFaltando />
  ) : ehApadrinhamento ? (
    <TelaApadrinhar />
  ) : (
    <ProvedorSessao>
      <ProvedorDadosRifa>
        <App />
      </ProvedorDadosRifa>
    </ProvedorSessao>
  )
)
