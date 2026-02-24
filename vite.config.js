import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      devOptions: { enabled: false }, // 開発時はService Workerを無効化（キャッシュによる表示不具合を防止）
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'リズトレカレンダー',
        short_name: 'リズトレカレンダー',
        description: 'レッスン日程・出欠共有アプリ',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0ea5e9',
        icons: [
          {
            src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📅</text></svg>',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  server: {
    host: 'localhost',
    port: 9010,
    strictPort: false
  },
  build: {
    rollupOptions: {
      input: 'index.html'
    }
  }
})
