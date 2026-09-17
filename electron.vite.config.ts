import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// 仅在打包构建时注入内容安全策略:
// 开发模式下 vite 热更新依赖内联脚本,注入后会导致开发模式白屏,故只在 build 时注入
function injectCsp(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // antd 动态注入样式需要
    "img-src 'self' data:",
    "font-src 'self' data:"
  ].join('; ')
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `  <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`
      )
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react(), injectCsp()]
  }
})
