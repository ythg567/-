import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useBitable,
  IFieldMeta,
  IViewMeta,
  isAttachmentField,
  SUPPORT_TEXT_TYPES,
  FieldType
} from './hooks/useBitable'
import { usePresets, FormState, defaultForm } from './hooks/usePresets'
import { AttachmentDownloader, DownloadConfig } from './utils/download'
import { saveAs } from 'file-saver'

// Inline SVG icons (no extra dependency)
const Icons = {
  cloudDownload: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
    </svg>
  ),
  person: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  ),
  flag: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
    </svg>
  ),
  save: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  ),
  download2: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
    </svg>
  ),
  delete: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  ),
  drag: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  ),
  arrowUp: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
    </svg>
  ),
  arrowDown: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
    </svg>
  ),
  qrcode: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2zM17 17h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z" />
    </svg>
  ),
  minus: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M19 13H5v-2h14v2z" />
    </svg>
  )
}

type Tab = 'download' | 'my'

function Info({ tip }: { tip: string }) {
  return (
    <span className="info-icon" title={tip}>
      {Icons.info}
    </span>
  )
}

/** Green switch matching screenshot */
function Switch({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  )
}

/** Green checkbox matching screenshot */
function Checkbox({
  checked,
  onChange,
  children
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <label className="checkbox-row" onClick={() => onChange(!checked)}>
      <span className={`checkbox ${checked ? 'checked' : ''}`}>{checked ? Icons.check : null}</span>
      {children && <span className="checkbox-label">{children}</span>}
    </label>
  )
}

/** Tag multi-select: show selected as removable tags + dropdown to add more */
function TagSelector({
  options,
  selected,
  onChange,
  placeholder,
  emptyText
}: {
  options: IFieldMeta[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  emptyText?: string
}) {
  const available = options.filter((o) => !selected.includes(o.id))
  const handleSelect = (id: string) => {
    if (!id) return
    onChange([...selected, id])
  }
  const handleRemove = (id: string) => {
    onChange(selected.filter((s) => s !== id))
  }
  return (
    <div className="tag-selector">
      <div className="tag-box">
        {selected.length === 0 && <span className="tag-placeholder">{placeholder || '请选择'}</span>}
        {selected.map((id) => {
          const item = options.find((o) => o.id === id)
          if (!item) return null
          return (
            <span key={id} className="tag">
              {item.name}
              <button type="button" className="tag-remove" onClick={() => handleRemove(id)}>
                {Icons.close}
              </button>
            </span>
          )
        })}
      </div>
      <select
        className="tag-add"
        value=""
        onChange={(e) => handleSelect(e.target.value)}
        disabled={available.length === 0}
      >
        <option value="">{available.length === 0 ? emptyText || '无更多选项' : '+ 添加'}</option>
        {available.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function App() {
  const {
    loading,
    error,
    tableInfoList,
    selection,
    getTableInfo,
    fetchRecords,
    getSelectedRecordIds,
    getCellString,
    getAttachmentUrl,
    checkDownloadPermission,
    showToast
  } = useBitable()

  const [activeTab, setActiveTab] = useState<Tab>('download')
  const [form, setForm] = useState<FormState>(defaultForm)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
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
  } = usePresets(form)

  const [isDownloading, setIsDownloading] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    currentName: '',
    currentPercentage: 0
  })
  const [log, setLog] = useState<string[]>([])
  /** 当前正在运行/最近完成的下载器实例，用于「取消」 */
  const activeDownloaderRef = useRef<AttachmentDownloader | null>(null)
  /** 最近一次导出的 IDM 直链文本，供「复制到剪贴板」 */
  const [lastLinksText, setLastLinksText] = useState('')
  const [exportDone, setExportDone] = useState(false)
  /** 用户是否点击了取消 */
  const cancelledRef = useRef(false)

  // Membership mock state
  const [memberInfo] = useState(() => {
    const chars = '0123456789ABCDEF'
    const id =
      'FM-' +
      Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    return {
      id,
      trialEnd,
      used: 0,
      total: 1000,
      status: '生效中' as const
    }
  })

  useEffect(() => {
    if (!storageAvailable) {
      showToast('当前环境无法持久化预设，配置仅在本次会话有效', 'warning')
    }
  }, [storageAvailable, showToast])

  const activeTable = useMemo(
    () => (form.tableId ? getTableInfo(form.tableId) : null),
    [form.tableId, getTableInfo]
  )

  const views = useMemo<IViewMeta[]>(() => activeTable?.viewMetaList || [], [activeTable])
  const fields = useMemo<IFieldMeta[]>(() => activeTable?.fieldMetaList || [], [activeTable])
  const fieldMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of fields) map.set(f.id, f.name)
    return map
  }, [fields])

  const attachmentFields = useMemo(
    () => fields.filter((f) => isAttachmentField(f, tableInfoList)),
    [fields, tableInfoList]
  )
  const textFields = useMemo(
    () => fields.filter((f) => SUPPORT_TEXT_TYPES.includes(f.type)),
    [fields]
  )
  const urlFields = useMemo(
    () => fields.filter((f) => f.type === FieldType.Text || f.type === FieldType.Url),
    [fields]
  )
  const allExportableFields = useMemo(
    () => fields.filter((f) => f.type !== FieldType.Attachment),
    [fields]
  )

  // Auto select defaults when table changes
  useEffect(() => {
    if (!activeTable) return

    setForm((prev) => {
      const next = { ...prev }
      const viewExists = views.some((v) => v.id === prev.viewId)
      if (!viewExists) {
        next.viewId =
          selection.viewId && views.some((v) => v.id === selection.viewId)
            ? selection.viewId
            : views[0]?.id || ''
      }
      if (attachmentFields.length > 0 && prev.attachmentFieldIds.length === 0) {
        next.attachmentFieldIds = attachmentFields.map((f) => f.id)
      }
      return next
    })
  }, [activeTable, views, attachmentFields, selection.viewId])

  useEffect(() => {
    if (selection.tableId) {
      setForm((prev) => ({ ...prev, tableId: selection.tableId || '' }))
    }
  }, [selection.tableId])

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleAttachmentChange = (ids: string[]) => {
    updateForm('attachmentFieldIds', ids)
  }

  const handleNameFieldChange = (ids: string[]) => {
    setForm((prev) => {
      const prevOrder = prev.fileNameOrderIds
      const added = ids.filter((id) => !prev.fileNameFieldIds.includes(id))
      const removed = prev.fileNameFieldIds.filter((id) => !ids.includes(id))
      const nextOrder = prevOrder.filter((id) => !removed.includes(id)).concat(added)
      return { ...prev, fileNameFieldIds: ids, fileNameOrderIds: nextOrder }
    })
  }

  const handleExportFieldChange = (ids: string[]) => {
    updateForm('exportFieldIds', ids)
  }

  const handleFolderLevelChange = (index: number, fieldId: string) => {
    setForm((prev) => {
      const next = [...prev.folderLevels]
      next[index] = { fieldId }
      return { ...prev, folderLevels: next }
    })
  }

  const handleAddFolderLevel = () => {
    setForm((prev) => ({
      ...prev,
      folderLevels: [...prev.folderLevels, { fieldId: '' }]
    }))
  }

  const handleRemoveFolderLevel = (index: number) => {
    setForm((prev) => ({
      ...prev,
      folderLevels: prev.folderLevels.filter((_, i) => i !== index)
    }))
  }

  const handleMoveFolderLevel = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const next = [...prev.folderLevels]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      const tmp = next[index]
      next[index] = next[target]
      next[target] = tmp
      return { ...prev, folderLevels: next }
    })
  }

  const handlePresetSelect = (id: string) => {
    setSelectedId(id)
    if (!id) return
    const saved = loadPreset(id)
    if (saved) {
      setForm(saved)
      showToast('已加载预设配置', 'info')
    }
  }

  const handleSaveNewPreset = () => {
    try {
      const name = window.prompt('请输入新预设名称：', `预设 ${presets.length + 1}`)
      if (!name || !name.trim()) return
      saveNew(name.trim())
      const msg = storageAvailable
        ? '已保存为新预设'
        : '已保存为新预设（当前会话有效，刷新后丢失）'
      showToast(msg, 'success')
    } catch (err: any) {
      showToast(`保存失败：${err.message || '未知错误'}`, 'warning')
    }
  }

  const handleOverwritePreset = () => {
    if (!selectedId) {
      showToast('请先选择一个预设', 'warning')
      return
    }
    const preset = presets.find((p) => p.id === selectedId)
    if (!preset) return
    if (window.confirm(`确定用当前配置覆盖预设「${preset.name}」吗？`)) {
      try {
        overwrite(selectedId)
        showToast('已覆盖所选预设', 'success')
      } catch (err: any) {
        showToast(`覆盖失败：${err.message || '未知错误'}`, 'warning')
      }
    }
  }

  const handleDeletePreset = () => {
    if (!selectedId) {
      showToast('请先选择一个预设', 'warning')
      return
    }
    const preset = presets.find((p) => p.id === selectedId)
    if (!preset) return
    if (window.confirm(`确定删除预设「${preset.name}」吗？`)) {
      try {
        remove(selectedId)
        showToast('已删除所选预设', 'success')
      } catch (err: any) {
        showToast(`删除失败：${err.message || '未知错误'}`, 'warning')
      }
    }
  }

  const handleExportPresets = () => {
    try {
      if (presets.length === 0) {
        showToast('当前没有可导出的预设', 'warning')
        return
      }
      const blob = new Blob([exportJson()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feishu-bitable-presets-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('预设已导出', 'success')
    } catch (err: any) {
      showToast(`导出失败：${err.message || '未知错误'}`, 'warning')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const result = importFromJson(text)
      if (result.ok) {
        showToast(`成功导入 ${result.count} 个预设`, 'success')
      } else {
        showToast(result.error, 'warning')
      }
    } catch (err: any) {
      showToast(`导入失败：${err.message || '未知错误'}`, 'warning')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const validate = (): string | null => {
    if (!form.tableId) return '请选择数据表'
    if (!form.viewId) return '请选择视图'
    if (form.attachmentFieldIds.length === 0 && !form.recordContent) {
      return '请至少选择附件字段或开启记录内容导出'
    }
    if (form.recordContent && form.exportFieldIds.length === 0) {
      return '开启记录内容后，请选择要导出的字段'
    }
    if (form.fileNameType === 'field' && form.fileNameFieldIds.length === 0) {
      return '请选择用于命名的字段'
    }
    if (form.folderClassification && form.folderLevels.length === 0) {
      return '开启文件夹分类后，请至少添加一个目录层级'
    }
    if (form.folderClassification && form.folderLevels.some((l) => !l.fieldId)) {
      return '请为每个目录层级选择字段'
    }
    return null
  }

  const handleDownload = async (selectedOnly: boolean) => {
    const err = validate()
    if (err) {
      await showToast(err, 'warning')
      return
    }

    const hasPermission = await checkDownloadPermission()
    if (!hasPermission) {
      await showToast('您没有下载权限，请联系管理员', 'warning')
      return
    }

    let selectedRecordIds: string[] | undefined
    if (selectedOnly) {
      selectedRecordIds = await getSelectedRecordIds(form.tableId, form.viewId)
      if (!selectedRecordIds || selectedRecordIds.length === 0) {
        await showToast('当前没有选中的记录', 'warning')
        return
      }
    }

    const config: DownloadConfig = {
      tableId: form.tableId,
      viewId: form.viewId,
      attachmentFieldIds: form.attachmentFieldIds,
      fileNameType: form.fileNameType,
      fileNameFieldIds: form.fileNameFieldIds,
      fileNameOrderIds: form.fileNameOrderIds,
      nameDelimiter: form.nameDelimiter,
      downloadMode: form.downloadMode,
      folderClassification: form.folderClassification,
      folderLevels: form.folderLevels,
      recordContent: form.recordContent,
      exportFormat: form.exportFormat,
      exportFieldIds: form.exportFieldIds,
      showFieldName: form.showFieldName,
      keepBlankLine: form.keepBlankLine,
      ignoreEmptyField: form.ignoreEmptyField,
      emptyFieldHandling: form.emptyFieldHandling,
      concurrency: form.concurrency,
      downloadExecution: form.downloadExecution
    }

    setProgress({ total: 0, completed: 0, failed: 0, currentName: '', currentPercentage: 0 })
    setLog([])
    setIsDownloading(true)
    setProgressOpen(true)
    setExportDone(false)
    cancelledRef.current = false

    const downloader = new AttachmentDownloader(
      config,
      { fetchRecords, getCellString, getAttachmentUrl },
      activeTable?.name || '附件下载',
      fieldMap
    )
    activeDownloaderRef.current = downloader

    downloader.on((event) => {
      switch (event.type) {
        case 'pending':
          setProgress((p) => ({ ...p, total: event.total }))
          break
        case 'progress':
          setProgress((p) => ({
            ...p,
            currentName: event.name,
            currentPercentage: event.percentage,
            completed: event.percentage === 100 ? p.completed + 1 : p.completed
          }))
          break
        case 'error':
          setProgress((p) => ({ ...p, failed: p.failed + 1 }))
          setLog((l) => [...l, `失败 #${event.index}：${event.message}`])
          break
        case 'warn':
          setLog((l) => [...l, `警告：${event.message}`])
          break
        case 'info':
          setLog((l) => [...l, event.message])
          break
        case 'cancelled':
          setLog((l) => [...l, '已取消'])
          break
        case 'finished':
          setIsDownloading(false)
          activeDownloaderRef.current = null
          break
      }
    })

    await downloader.start(selectedRecordIds)
  }

  const handleExportLinks = async () => {
    if (!form.tableId) {
      await showToast('请选择数据表', 'warning')
      return
    }
    if (form.attachmentFieldIds.length === 0) {
      await showToast('请先选择附件字段', 'warning')
      return
    }

    // 若视图中有勾选记录，则只导出所选；否则导出全部
    let selectedRecordIds: string[] | undefined
    const sel = await getSelectedRecordIds(form.tableId, form.viewId)
    if (sel && sel.length > 0) selectedRecordIds = sel

    const scopeText = selectedRecordIds ? `所选 ${selectedRecordIds.length} 条记录` : '全部记录'

    const config: DownloadConfig = {
      tableId: form.tableId,
      viewId: form.viewId,
      attachmentFieldIds: form.attachmentFieldIds,
      fileNameType: form.fileNameType,
      fileNameFieldIds: form.fileNameFieldIds,
      fileNameOrderIds: form.fileNameOrderIds,
      nameDelimiter: form.nameDelimiter,
      downloadMode: form.downloadMode,
      folderClassification: form.folderClassification,
      folderLevels: form.folderLevels,
      recordContent: false,
      exportFormat: form.exportFormat,
      exportFieldIds: [],
      showFieldName: false,
      keepBlankLine: false,
      ignoreEmptyField: false,
      emptyFieldHandling: 'ignore',
      concurrency: form.concurrency,
      downloadExecution: form.downloadExecution
    }

    setProgress({ total: 0, completed: 0, failed: 0, currentName: '', currentPercentage: 0 })
    setLog([])
    setIsDownloading(true)
    setProgressOpen(true)
    setExportDone(false)
    setLastLinksText('')
    cancelledRef.current = false

    const downloader = new AttachmentDownloader(
      config,
      { fetchRecords, getCellString, getAttachmentUrl },
      activeTable?.name || '附件下载',
      fieldMap
    )
    activeDownloaderRef.current = downloader

    downloader.on((event) => {
      switch (event.type) {
        case 'pending':
          setProgress((p) => ({ ...p, total: event.total }))
          break
        case 'progress':
          setProgress((p) => ({
            ...p,
            currentName: event.name,
            currentPercentage: event.percentage,
            completed: event.percentage === 100 ? p.completed + 1 : p.completed
          }))
          break
        case 'error':
          setProgress((p) => ({ ...p, failed: p.failed + 1 }))
          setLog((l) => [...l, `失败 #${event.index}：${event.message}`])
          break
        case 'warn':
          setLog((l) => [...l, `警告：${event.message}`])
          break
        case 'info':
          setLog((l) => [...l, event.message])
          break
        case 'cancelled':
          setLog((l) => [...l, '已取消'])
          break
        case 'finished':
          setIsDownloading(false)
          activeDownloaderRef.current = null
          break
      }
    })

    try {
      const links = await downloader.collectAttachmentLinks(selectedRecordIds)

      if (cancelledRef.current) {
        // 用户已取消，不导出文件
        return
      }

      if (links.length === 0) {
        await showToast('没有可导出的附件链接', 'warning')
        return
      }

      const stamp = new Date().toISOString().slice(0, 10)
      const txt = links.map((l) => l.url).join('\n')
      setLastLinksText(txt)
      setExportDone(true)
      // 1) IDM 专用：每行一个直链（IDM 批量导入即可多线程加速）
      saveAs(new Blob([txt], { type: 'text/plain;charset=utf-8' }), `下载链接_IDM_${stamp}.txt`)
      // 2) 明细对照：文件名 / 直链 / 记录ID（供参考，链接与上方一致）
      const detail = links.map((l) => ({ name: l.displayName, url: l.url, recordId: l.recordId }))
      setTimeout(() => {
        saveAs(
          new Blob([JSON.stringify(detail, null, 2)], { type: 'application/json' }),
          `下载链接明细_${stamp}.json`
        )
      }, 300)

      await showToast(
        `已导出 ${links.length} 个下载链接（${scopeText}）。可「复制到剪贴板」直接粘进 IDM；飞书直链有时效，请尽快使用`,
        'success'
      )
    } catch (err: any) {
      await showToast(`导出失败：${err?.message || '未知错误'}`, 'warning')
    }
  }

  const handleCancel = () => {
    cancelledRef.current = true
    activeDownloaderRef.current?.cancel()
    showToast('正在取消，请稍候...', 'info')
  }

  const handleCopyLinks = async () => {
    if (!lastLinksText) return
    try {
      await navigator.clipboard.writeText(lastLinksText)
      showToast('下载链接已复制到剪贴板，可直接粘进 IDM', 'success')
    } catch {
      // 剪贴板不可用时，退回提示用户手动复制
      showToast('复制失败，请改用文件方式导入 IDM', 'warning')
    }
  }

  const handleCopyMemberId = async () => {
    try {
      await navigator.clipboard.writeText(memberInfo.id)
      showToast('会员 ID 已复制', 'success')
    } catch {
      showToast('复制失败', 'warning')
    }
  }

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}/${mm}/${dd} ${hh}:${mi}`
  }

  if (loading) {
    return (
      <div className="plugin-container center">
        <div className="spinner" />
        <p>正在加载多维表格信息...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="plugin-container center error">
        <p>加载失败：{error}</p>
        <p>请确认已打开一个多维表格，并拥有查看权限。</p>
      </div>
    )
  }

  return (
    <div className="plugin-container">
      {/* Header */}
      <div className="plugin-header">
        <h1 className="plugin-title">附件批量下载</h1>
        <div className="header-actions">
          <button type="button" data-tip="帮助" onClick={() => showToast('请联系管理员获取帮助', 'info')}>
            {Icons.help}
          </button>
          <button type="button" data-tip="刷新" onClick={() => window.location.reload()}>
            {Icons.refresh}
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={activeTab === 'download' ? 'active' : ''}
          onClick={() => setActiveTab('download')}
        >
          <span className="tab-icon">{Icons.cloudDownload}</span>
          下载
        </button>
        <button className={activeTab === 'my' ? 'active' : ''} onClick={() => setActiveTab('my')}>
          <span className="tab-icon">{Icons.person}</span>
          我的
        </button>
      </div>

      {activeTab === 'download' && (
        <div className="panel">
          {/* 配置预设 */}
          <div className="card preset-card">
            <div className="preset-header">
              <span className="preset-title">
                <span className="preset-flag">{Icons.flag}</span>
                配置预设
              </span>
              <select
                className="preset-select"
                value={selectedId}
                onChange={(e) => handlePresetSelect(e.target.value)}
              >
                <option value="">选择配置预设</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="preset-actions">
                <button
                  type="button"
                  className="action-blue"
                  data-tip="保存当前配置为新预设"
                  onClick={handleSaveNewPreset}
                >
                  {Icons.save}
                </button>
                <button
                  type="button"
                  className="action-blue"
                  data-tip="用当前配置覆盖所选预设"
                  onClick={handleOverwritePreset}
                  disabled={!selectedId}
                >
                  {Icons.edit}
                </button>
                <button
                  type="button"
                  data-tip="导出预设"
                  onClick={handleExportPresets}
                  disabled={presets.length === 0}
                >
                  {Icons.download2}
                </button>
                <button type="button" data-tip="从 JSON 文件导入预设" onClick={handleImportClick}>
                  {Icons.upload}
                </button>
                <button
                  type="button"
                  className="action-red"
                  data-tip="删除所选预设"
                  onClick={handleDeletePreset}
                  disabled={!selectedId}
                >
                  {Icons.delete}
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </div>

          {/* 基础配置 */}
          <div className="card">
            <div className="card-title">基础配置</div>

            <div className="form-row">
              <label className="form-label">数据表列</label>
              <div className="form-control">
                <select value={form.tableId} onChange={(e) => updateForm('tableId', e.target.value)}>
                  <option value="">请选择数据表</option>
                  {tableInfoList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">
                视图列
                <Info tip="只会下载当前视图中可见的记录" />
              </label>
              <div className="form-control">
                <select value={form.viewId} onChange={(e) => updateForm('viewId', e.target.value)}>
                  <option value="">请选择视图</option>
                  {views.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">附件字段</label>
              <div className="form-control">
                <TagSelector
                  options={attachmentFields}
                  selected={form.attachmentFieldIds}
                  onChange={handleAttachmentChange}
                  placeholder="请选择附件字段"
                  emptyText="无更多附件字段"
                />
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">
                URL 字段
                <Info tip="预留字段，当前版本仅做展示" />
              </label>
              <div className="form-control">
                <select value={form.urlFieldId} onChange={(e) => updateForm('urlFieldId', e.target.value)}>
                  <option value="">请选择 URL 字段</option>
                  {urlFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button className="advanced-toggle" onClick={() => setAdvancedOpen((v) => !v)}>
              高级设置
              <span className={`advanced-chevron ${advancedOpen ? 'open' : ''}`}>▼</span>
            </button>

            {advancedOpen && (
              <div className="advanced-body">
                <div className="form-row">
                  <label className="form-label">并发数</label>
                  <div className="form-control">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={form.concurrency}
                      onChange={(e) =>
                        updateForm(
                          'concurrency',
                          Math.max(1, Math.min(20, Number(e.target.value) || 1))
                        )
                      }
                    />
                    <div className="hint">同时下载的文件数，建议 4-8；过大会触发飞书限流</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 记录内容 */}
          <div className="card toggle-card">
            <div className="toggle-row">
              <span className="toggle-label">记录内容</span>
              <Switch checked={form.recordContent} onChange={(v) => updateForm('recordContent', v)} />
            </div>
          </div>

          {/* 导出格式 */}
          {form.recordContent && (
            <div className="card">
              <div className="form-row">
                <label className="form-label">导出格式</label>
                <div className="form-control">
                  <select
                    value={form.exportFormat}
                    onChange={(e) => updateForm('exportFormat', e.target.value as any)}
                  >
                    <option value="txt">TXT</option>
                    <option value="md">Markdown</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 文件命名与导出字段 */}
          <div className="card">
            <div className="form-row">
              <label className="form-label">文件命名方式</label>
              <div className="form-control">
                <select
                  value={form.fileNameType}
                  onChange={(e) => updateForm('fileNameType', e.target.value as 'original' | 'field')}
                >
                  <option value="original">原文件名称</option>
                  <option value="field">从表字段选择</option>
                </select>
              </div>
            </div>

            {form.fileNameType === 'field' && (
              <div className="form-row">
                <label className="form-label">文件名字段</label>
                <div className="form-control">
                  <TagSelector
                    options={textFields}
                    selected={form.fileNameFieldIds}
                    onChange={handleNameFieldChange}
                    placeholder="可选，用于生成文件名，不会自动写入文件内容"
                    emptyText="无更多字段"
                  />
                </div>
              </div>
            )}

            {form.recordContent && (
              <>
                <div className="form-row">
                  <label className="form-label">要导出的字段</label>
                  <div className="form-control">
                    <TagSelector
                      options={allExportableFields}
                      selected={form.exportFieldIds}
                      onChange={handleExportFieldChange}
                      placeholder="选择要导出的字段"
                      emptyText="无更多字段"
                    />
                  </div>
                </div>

                <div className="card toggle-card inner">
                  <div className="toggle-row">
                    <span className="toggle-label">显示字段名</span>
                    <Switch
                      checked={form.showFieldName}
                      onChange={(v) => updateForm('showFieldName', v)}
                    />
                  </div>
                </div>

                <div className="card toggle-card inner">
                  <div className="toggle-row">
                    <span className="toggle-label">字段之间保留空行</span>
                    <Switch
                      checked={form.keepBlankLine}
                      onChange={(v) => updateForm('keepBlankLine', v)}
                    />
                  </div>
                </div>

                <div className="form-row checkbox-row-wrap">
                  <Checkbox
                    checked={form.ignoreEmptyField}
                    onChange={(v) => updateForm('ignoreEmptyField', v)}
                  >
                    忽略空字段
                  </Checkbox>
                </div>

                <div className="form-row">
                  <label className="form-label">空字段处理</label>
                  <div className="form-control">
                    <select
                      value={form.emptyFieldHandling}
                      onChange={(e) => updateForm('emptyFieldHandling', e.target.value as any)}
                    >
                      <option value="ignore">忽略空字段</option>
                      <option value="keep">保留空字段</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 文件夹分类 */}
          <div className="card toggle-card">
            <div className="toggle-row">
              <span className="toggle-label">文件夹分类</span>
              <Switch
                checked={form.folderClassification}
                onChange={(v) => updateForm('folderClassification', v)}
              />
            </div>
          </div>

          {form.folderClassification && form.downloadMode === 'zip' && (
            <div className="card">
              <div className="card-title">
                目录层级
                <Info tip="按字段值创建多级文件夹，仅在 ZIP 打包时生效" />
              </div>
              {form.folderLevels.map((level, index) => (
                <div className="folder-level-row" key={index}>
                  <span className="folder-level-index">{index + 1}</span>
                  <select
                    value={level.fieldId}
                    onChange={(e) => handleFolderLevelChange(index, e.target.value)}
                  >
                    <option value="">请选择目录字段</option>
                    {textFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <div className="folder-level-actions">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveFolderLevel(index, -1)}
                    >
                      {Icons.arrowUp}
                    </button>
                    <button
                      type="button"
                      disabled={index === form.folderLevels.length - 1}
                      onClick={() => handleMoveFolderLevel(index, 1)}
                    >
                      {Icons.arrowDown}
                    </button>
                    <button type="button" className="action-red" onClick={() => handleRemoveFolderLevel(index)}>
                      {Icons.delete}
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="add-level-btn" onClick={handleAddFolderLevel}>
                <span className="btn-icon">{Icons.plus}</span>
                添加目录层级
              </button>
            </div>
          )}

          {/* 下载配置 */}
          <div className="card">
            <div className="card-title">下载配置</div>
            <div className="form-row">
              <label className="form-label">下载执行方式</label>
              <div className="form-control">
                <select value="browser" disabled>
                  <option value="browser">浏览器直接下载</option>
                </select>
                <div className="hint">当前版本仅支持浏览器直接下载</div>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">下载方式</label>
              <div className="form-control">
                <select
                  value={form.downloadMode}
                  onChange={(e) => updateForm('downloadMode', e.target.value as 'zip' | 'individual')}
                >
                  <option value="zip">zip 打包下载</option>
                  <option value="individual">单独下载</option>
                </select>
              </div>
            </div>
          </div>

          <div className="footer-actions">
            <button className="btn-secondary" onClick={() => handleDownload(true)} disabled={isDownloading}>
              下载所选记录
            </button>
            <button className="btn-primary" onClick={() => handleDownload(false)} disabled={isDownloading}>
              下载全部记录
              <span className="btn-icon">{Icons.cloudDownload}</span>
            </button>
          </div>
          <div className="footer-actions">
            <button className="btn-secondary full" onClick={handleExportLinks} disabled={isDownloading}>
              导出下载链接（IDM 批量加速）
            </button>
          </div>
        </div>
      )}

      {activeTab === 'my' && (
        <div className="panel my-panel">
          <div className="my-header">
            <h2>会员</h2>
            <button type="button" onClick={() => window.location.reload()}>
              {Icons.refresh}
            </button>
          </div>

          <div className="card member-card">
            <div className="member-row">
              <div className="member-label">会员 ID</div>
              <div className="member-id">{memberInfo.id}</div>
              <button type="button" className="copy-btn" onClick={handleCopyMemberId}>
                {Icons.copy}
                复制
              </button>
            </div>
          </div>

          <div className="card trial-card">
            <div className="trial-title">7天免费试用</div>
            <div className="trial-status">
              <span className="trial-date">有效期至 {formatDate(memberInfo.trialEnd)}</span>
              <span className="status-tag active">{memberInfo.status}</span>
            </div>
            <div className="trial-usage">
              <span>
                已使用 <strong>{memberInfo.used}</strong> / {memberInfo.total.toLocaleString()} 个文件
              </span>
              <span>
                剩余 <strong>{(memberInfo.total - memberInfo.used).toLocaleString()}</strong> 个文件
              </span>
            </div>
          </div>

          <div className="record-grid">
            <button type="button" className="record-item" onClick={() => showToast('暂无支付记录', 'info')}>
              <span className="record-icon">{Icons.card}</span>
              <span>支付记录</span>
            </button>
            <button type="button" className="record-item" onClick={() => showToast('暂无开通记录', 'info')}>
              <span className="record-icon">{Icons.qrcode}</span>
              <span>开通记录</span>
            </button>
            <button type="button" className="record-item" onClick={() => showToast('暂无消耗记录', 'info')}>
              <span className="record-icon">{Icons.minus}</span>
              <span>消耗记录</span>
            </button>
          </div>

          <div className="member-actions">
            <button type="button" className="btn-outline" onClick={() => showToast('功能开发中', 'info')}>
              兑换激活码
            </button>
            <button type="button" className="btn-primary" onClick={() => showToast('功能开发中', 'info')}>
              购买套餐
            </button>
          </div>

          <div className="version">当前版本 2.0.18</div>
        </div>
      )}

      {progressOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!isDownloading) setProgressOpen(false)
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>下载进度</h4>
              {!isDownloading && (
                <button className="close" onClick={() => setProgressOpen(false)}>
                  {Icons.close}
                </button>
              )}
            </div>
            <div className="modal-body">
              <div className="stat-row">
                <span>总数：{progress.total}</span>
                <span>成功：{progress.completed}</span>
                <span>失败：{progress.failed}</span>
              </div>
              {progress.total > 0 && (
                <div className="current-file">
                  <div className="file-name" title={progress.currentName}>
                    {progress.currentName ? `正在处理：${progress.currentName}` : '准备中...'}
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progress.total ? Math.round((progress.completed / progress.total) * 100) : 0}%`
                      }}
                    />
                  </div>
                  <div className="progress-text">
                    总进度 {progress.completed}/{progress.total}（
                    {progress.total ? Math.round((progress.completed / progress.total) * 100) : 0}%）
                  </div>
                </div>
              )}
              <div className="log">
                {log.slice(-10).map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {log.length === 0 && <div className="muted">等待开始...</div>}
              </div>
            </div>
            <div className="modal-footer">
              {isDownloading && (
                <button className="btn-secondary" onClick={handleCancel}>
                  取消
                </button>
              )}
              {exportDone && lastLinksText && !isDownloading && (
                <button className="btn-secondary" onClick={handleCopyLinks}>
                  复制到剪贴板
                </button>
              )}
              {!isDownloading && (
                <button className="btn-primary" onClick={() => setProgressOpen(false)}>
                  完成
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
