const ILLEGAL_CHARS = /[\\/:*?"<>|]/g

export function sanitizeFileName(name: string): string {
  return name.replace(ILLEGAL_CHARS, '_').replace(/\s+/g, ' ').trim()
}

export function getFolderName(name: string): string {
  return sanitizeFileName(name).replace(/\.+$/, '') || '未分类'
}

export function replaceFileName(originalName: string, newBaseName: string, fallback: string = '未命名'): string {
  const lastDot = originalName.lastIndexOf('.')
  const ext = lastDot >= 0 ? originalName.slice(lastDot) : ''
  const base = newBaseName || fallback
  return `${sanitizeFileName(base)}${ext}`
}

export function getUniqueName(name: string, path: string, used: Set<string>): string {
  if (!used.has(path + name)) {
    used.add(path + name)
    return name
  }
  const lastDot = name.lastIndexOf('.')
  const ext = lastDot >= 0 ? name.slice(lastDot) : ''
  const base = lastDot >= 0 ? name.slice(0, lastDot) : name
  let index = 1
  let candidate = `${base}_${index}${ext}`
  while (used.has(path + candidate)) {
    index += 1
    candidate = `${base}_${index}${ext}`
  }
  used.add(path + candidate)
  return candidate
}

export function formatFileSize(bytes?: number): string {
  if (bytes == null || bytes < 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}
