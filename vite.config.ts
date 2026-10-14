import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'tauri-dev-logger',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/__log', (req, res) => {
          let body = ''
          req.on('data', (chunk) => (body += chunk))
          req.on('end', () => {
            console.log('[WEBVIEW LOG]', body)
            res.end('ok')
          })
        })
        server.ws.on('connection', () => {
          console.log('[VITE WS] A client connected!')
        })
      },
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            children: `
              (function() {
                var sending = false;
                function send(type, text) {
                  if (sending || !text) return;
                  if (typeof text !== 'string') text = String(text);
                  if (text.indexOf('/__log') !== -1 || text.indexOf('[vite]') !== -1) return;
                  sending = true;
                  try {
                    fetch('/__log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'text/plain' },
                      body: type + ': ' + text
                    }).catch(function() {}).finally(function() { sending = false; });
                  } catch(e) {
                    sending = false;
                  }
                }
                var origLog = console.log, origErr = console.error, origWarn = console.warn, origInfo = console.info, origDebug = console.debug;
                console.log = function() { origLog.apply(console, arguments); send('LOG', Array.from(arguments).map(String).join(' ')); };
                console.error = function() { origErr.apply(console, arguments); send('ERROR', Array.from(arguments).map(String).join(' ')); };
                console.warn = function() { origWarn.apply(console, arguments); send('WARN', Array.from(arguments).map(String).join(' ')); };
                console.info = function() { origInfo.apply(console, arguments); send('INFO', Array.from(arguments).map(String).join(' ')); };
                console.debug = function() { origDebug.apply(console, arguments); send('DEBUG', Array.from(arguments).map(String).join(' ')); };
                window.addEventListener('error', function(e) {
                  send('UNCAUGHT', e.message + ' at ' + (e.filename || '') + ':' + (e.lineno || ''));
                });
                window.addEventListener('unhandledrejection', function(e) {
                  send('UNHANDLED_REJECTION', String(e.reason));
                });
              })();
            `,
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  ],
  clearScreen: false,
  server: {
    port: 5175,
    strictPort: true,
    host: host || '127.0.0.1',
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : true,
    watch: {
      ignored: ['**/src-tauri/**'],
      usePolling: process.env.VITE_USE_POLLING === 'true',
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tauri-apps/api',
    ],
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // Tauri desktop webviews support modern JS; avoid safari13 (breaks Vite 8 esbuild transpile).
    target: process.env.TAURI_ENV_PLATFORM ? 'chrome105' : 'es2022',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
