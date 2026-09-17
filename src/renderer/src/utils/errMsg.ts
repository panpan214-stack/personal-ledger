// 提取 IPC 错误中的真实信息,去掉 Electron 自动加上的前缀
// 例如 "Error invoking remote method 'categories:delete': Error: 该分类下还有 3 笔账目"
// 会被简化为 "该分类下还有 3 笔账目"
export function errMsg(err: unknown): string {
  const s = String(err instanceof Error ? err.message : err)
  return s.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}
