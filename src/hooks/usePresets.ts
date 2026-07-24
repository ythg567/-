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
  firstFolderFieldId: string
  secondFolderFieldId: string
}

export interface Preset {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  form: FormState
}

const STORAGE_KEY = 'feishu-bitable-downloader.presets'

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function readPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.presets) ? parsed.presets : []
  } catch {
    return []
  }
}

function writePresets(presets: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, presets }))
}

export function usePresets(form: FormState) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  // Load once on mount
  useEffect(() => {
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
      return preset ? preset.form : null
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
            form: { ...(p.form as FormState) }
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
    [form, presets, persist]
  )

  const exportJson = useCallback((): string => {
    return JSON.stringify({ version: 1, presets }, null, 2)
  }, [presets])

  return {
    presets,
    selectedId,
    setSelectedId,
    saveNew,
    overwrite,
    remove,
    loadPreset,
    importFromJson,
    exportJson
  }
}
