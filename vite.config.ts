import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // 固定文件名（不带 hash）：避免飞书 CDN 缓存了旧的 index.html 后，
        // 引用已被删除的内容哈希 JS 导致「加载不出来」始终卡在加载占位。
        // 固定名后，任何版本的 index.html 都能解析到同一份 JS，彻底消除 404 卡死。
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
