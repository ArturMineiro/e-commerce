import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Bibliotecas carregadas só em telas abertas sob demanda (lazy). Sem isso, o Vite as descobre no
    // meio do uso, recarrega a página e pode misturar duas cópias do React em desenvolvimento.
    include: ['qrcode.react'],
  },
})
