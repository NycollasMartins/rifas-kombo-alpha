import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 permite abrir o app no celular pela rede local durante os testes
    host: true,
    port: 5173,
  },
})
