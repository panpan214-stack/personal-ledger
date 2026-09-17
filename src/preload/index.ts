import { contextBridge } from 'electron'

// 界面与主进程之间的"安全通道",后续记账、统计等功能都通过这里调用
const api = {
  appName: '个人记账'
}

contextBridge.exposeInMainWorld('api', api)
