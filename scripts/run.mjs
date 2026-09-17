import { spawn } from 'node:child_process'
import path from 'node:path'

// 本机会话环境中存在误设的 ELECTRON_RUN_AS_NODE=1(来源不明的旧软件遗留),
// 它会强制 Electron 以纯命令行模式运行,导致应用启动失败。
// 该变量必须彻底【删除】(置空无效,Electron 按"是否存在"判断),故用本启动器代理启动。
delete process.env.ELECTRON_RUN_AS_NODE

const bin = path.resolve(process.cwd(), 'node_modules/electron-vite/bin/electron-vite.js')
const sub = process.argv[2] ?? 'dev'

const child = spawn(process.execPath, [bin, sub], { stdio: 'inherit', env: process.env })
child.on('exit', (code) => process.exit(code ?? 0))
