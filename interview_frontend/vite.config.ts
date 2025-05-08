import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // optimizeDeps: {
  //   exclude: ['@mediapipe/face_detection'], // Reverted this change
  // },
  // Optional: Explicitly tell Vite to treat wasm as an asset
  // assetsInclude: ['**/*.wasm'], 
})
