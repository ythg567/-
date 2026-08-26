import { useEffect, useState, useCallback } from 'react'

export interface FormState {
  tableId: string
  viewId: string
  attachmentFieldIds: string[]
  urlFieldId: string
  fileNameType: 'original' | 'field'
  fileNameFieldIds: string[]
  fileNameOrderIds: string[]
  nameDelimiter: string
  downloadMode: 'zip' | 'individual'
  folderClassification: boolean
  /** 可添加、删除、排序的多级目录字段 */
  folderLevels: { fieldId: string }[]
  /** 是否导出记录内容（文本文件） */
  recordContent: boolean
  /** 记录内容导出格式 */
  exportFormat: 'txt' | 'md' | 'json'
  /** 要导出到记录内容中的字段 */
  exportFieldIds: string[]
  /** 是否在导出的记录内容中显示字段名 */
  showFieldName: boolean
  /** 字段之间是否保留空行 */
  keepBlankLine: boolean
  /** 是否忽略空字段 */
  ignoreEmptyField: boolean
  /** 空字段处理方式：忽略 / 保留 */
  emptyFieldHandling: 'ignore' | 'keep'
  /** 导出 ef2 队列文件时，IDM 保存附件的基础本地路径（Windows 路径） */
  ef2BasePath: string
  /** 同时下载的文件并发数（越大越快，过大会触发限流） */
  concurrency: number
  /** 下载执行方式，当前仅支持浏览器直接下载 */
  downloadExecution: 'browser'
}

export interface Preset {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  form: FormState
}

const STORAGE_KEY = 'feishu-bitable-downloader.presets'

export const defaultForm: FormState = {
  tableId: '',
  viewId: '',
  attachmentFieldIds: [],
  urlFieldId: '',
  fileNameType: 'original',
  fileNameFieldIds: [],
  fileNameOrderIds: [],
  nameDelimiter: '-',
  downloadMode: 'zip',
  folderClassification: false,
  folderLevels: [],
  ef2BasePath: '',
  recordContent: false,
  exportFormat: 'txt',
  exportFieldIds: [],
  showFieldName: false,
  keepBlankLine: false,
  ignoreEmptyField: false,
  emptyFieldHandling: 'ignore',
  concurrency: 6,
  downloadExecution: 'browser'
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function detectStorage(): boolean {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/** 把旧版预设中的 first/secondFolderFieldId 迁移为 folderLevels */
function migrateForm(form: any): FormState {
  const next = { ...defaultForm, ...(form || {}) }
  // 兼容旧版只有两级目录的配置
  if (!Array.isArray(next.folderLevels) || next.folderLevels.length === 0) {
    const levels: { fieldId: string }[] = []
    if (form?.firstFolderFieldId) levels.push({ fieldId: form.firstFolderFieldId })
    if (form?.secondFolderFieldId) levels.push({ fieldId: form.secondFolderFieldId })
    next.folderLevels = levels
  }
  return next as FormState
}

function readPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed.presets) ? parsed.presets : []
    return arr.map((p: any) => ({
      id: p.id || generateId(),
      name: String(p.name || '未命名预设'),
      createdAt: p.createdAt || Date.now(),
      updatedAt: p.updatedAt || Date.now(),
      form: migrateForm(p.form)
    }))
  } catch {
    return []
  }
}

function writePresets(presets: Preset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, presets }))
  } catch {
    // ignore in-memory fallback
  }
}

export function usePresets(form: FormState) {
  const [storageAvailable, setStorageAvailable] = useState<boolean>(false)
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  // Load once on mount
  useEffect(() => {
    const ok = detectStorage()
    setStorageAvailable(ok)
    setPresets(readPresets())
  }, [])

  const persist = useCallback((next: Preset[]) => {
    setPresets(next)
    writePresets(next)
  }, [])

  const saveNew = useCallback(
    (name: string) => {
      const preset: Preset = {
        id: generateId(),
        name: name.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        form: { ...form }
      }
      const next = [...presets, preset]
      persist(next)
      setSelectedId(preset.id)
      return preset
    },
    [form, presets, persist]
  )

  const overwrite = useCallback(
    (id: string) => {
      const next = presets.map((p) =>
        p.id === id ? { ...p, form: { ...form }, updatedAt: Date.now() } : p
      )
      persist(next)
    },
    [form, presets, persist]
  )

  const remove = useCallback(
    (id: string) => {
      const next = presets.filter((p) => p.id !== id)
      persist(next)
      if (selectedId === id) setSelectedId('')
    },
    [presets, selectedId, persist]
  )

  const loadPreset = useCallback(
    (id: string): FormState | null => {
      const preset = presets.find((p) => p.id === id)
      return preset ? migrateForm(preset.form) : null
    },
    [presets]
  )

  const importFromJson = useCallback(
    (jsonText: string): { ok: true; count: number } | { ok: false; error: string } => {
      try {
        const data = JSON.parse(jsonText)
        const imported = Array.isArray(data)
          ? data
          : Array.isArray(data.presets)
            ? data.presets
            : null
        if (!imported) {
          return { ok: false, error: 'JSON 格式不正确：缺少 presets 数组' }
        }
        const valid: Preset[] = imported
          .filter((p: any) => p && typeof p.name === 'string' && p.form && typeof p.form === 'object')
          .map((p: any) => ({
            id: p.id || generateId(),
            name: String(p.name).trim() || '未命名预设',
            createdAt: p.createdAt || Date.now(),
            updatedAt: Date.now(),
            form: migrateForm(p.form)
          }))
        if (valid.length === 0) {
          return { ok: false, error: '没有解析到有效的预设' }
        }
        const merged = [...presets]
        for (const p of valid) {
          const idx = merged.findIndex((x) => x.id === p.id)
          if (idx >= 0) {
            merged[idx] = p
          } else {
            merged.push(p)
          }
        }
        persist(merged)
        return { ok: true, count: valid.length }
      } catch (e: any) {
        return { ok: false, error: `解析失败：${e.message || '未知错误'}` }
      }
    },
    [presets, persist]
  )

  const exportJson = useCallback((): string => {
    return JSON.stringify({ version: 2, presets }, null, 2)
  }, [presets])

  return {
    presets,
    selectedId,
    storageAvailable,
    setSelectedId,
    saveNew,
    overwrite,
    remove,
    loadPreset,
    importFromJson,
    exportJson
  }
}
