import { createRoot } from 'react-dom/client'
import App from './App'
import TelaConfiguracaoFaltando from './components/TelaConfiguracaoFaltando'
import { ProvedorSessao } from './hooks/useSessao'
import { ProvedorDadosRifa } from './hooks/useDadosRifa'
import { supabaseConfigurado } from './lib/supabase'
import { registrarServiceWorker } from './utils/instalacao'
import './styles/global.css'

// destrava o botão "Instalar" no Android; não guarda nada em cache
registrarServiceWorker()

const raiz = createRoot(document.getElementById('root'))

raiz.render(
  supabaseConfigurado ? (
    <ProvedorSessao>
      <ProvedorDadosRifa>
        <App />
      </ProvedorDadosRifa>
    </ProvedorSessao>
  ) : (
    <TelaConfiguracaoFaltando />
  )
)
