import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['electron-store', 'conf', 'atomically', 'env-paths', 'ajv', 'json-schema-traverse'] })],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          preload: resolve('src/preload/preload.ts'),
          overlayPreload: resolve('src/preload/overlayPreload.ts'),
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve('src/renderer/index.html'),
          overlay: resolve('src/renderer/overlay/index.html'),
        },
      },
    },
  },
})
