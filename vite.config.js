import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** デプロイ日（ビルド実行日）。CI で固定したい場合は環境変数で上書き可 */
const deployDate =
  process.env.VITE_DEPLOY_DATE?.trim() ||
  new Date().toISOString().slice(0, 10)

export default defineConfig({
  define: {
    'import.meta.env.VITE_DEPLOY_DATE': JSON.stringify(deployDate),
  },
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
    port: 7001,
    strictPort: false
  },
  build: {
    rollupOptions: {
      input: 'index.html'
    }
  }
})
