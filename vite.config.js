import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
export default defineConfig({
    // sockjs-client 在浏览器中引用 Node 的 global，映射到 globalThis
    define: {
        global: 'globalThis',
    },
    plugins: [vue()],
    test: {
        exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
            // REST API 代理
            '/api': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                configure: function (proxy) {
                    proxy.on('error', function (error) { return console.error('[QMS API proxy]', error.message); });
                },
            },
            // WebSocket / SockJS 通知通道代理
            '/ws': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                ws: true,
                configure: function (proxy) {
                    proxy.on('error', function (error) { return console.error('[QMS WS proxy]', error.message); });
                },
            },
        },
    },
});
