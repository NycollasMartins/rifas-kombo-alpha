import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 permite abrir o app no celular pela rede local durante os testes
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // o leitor de PDF (pdf.js) traz um arquivo .mjs; dependendo da versão,
        // o Nginx entrega .mjs com o tipo errado e o navegador recusa rodar.
        // Saindo como .js, não tem como dar errado.
        assetFileNames: (arquivo) =>
          /\.mjs$/.test(arquivo.name || '')
            ? 'assets/[name]-[hash].js'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
