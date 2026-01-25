import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      workbox: {
        // 積極的な更新戦略
        skipWaiting: true,           // 新しいSWをすぐに有効化
        clientsClaim: true,          // 既存のクライアントをすぐに制御
        cleanupOutdatedCaches: true, // 古いキャッシュを自動削除
        
        // キャッシュ戦略
        runtimeCaching: [
          {
            // Firestore API（常にネットワーク優先）
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5  // 5分
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Firebase Auth API
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'auth-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 5
              }
            }
          },
          {
            // 静的ファイル（キャッシュ優先だがバックグラウンドで更新）
            urlPattern: /\.(?:js|css|html)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24  // 1日
              }
            }
          }
        ]
      },
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
})
