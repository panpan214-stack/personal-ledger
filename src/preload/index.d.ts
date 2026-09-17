export interface Api {
  appName: string
}

declare global {
  interface Window {
    api: Api
  }
}
