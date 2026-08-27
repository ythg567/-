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
import { sanitizeFileName } from './utils/fileName'
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

type FileItemStatus = 'pending' | 'downloading' | 'success' | 'failed' | 'cancelled'
interface FileItem {
  index: number
  name: string
  size: number
  loaded: number
  status: FileItemStatus
  message?: string
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)}${units[i]}`
}

function formatSpeed(bps: number): string {
  return `${formatBytes(bps)}/s`
}

function formatSeconds(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '--'
  if (sec < 60) return `${Math.ceil(sec)}秒`
  const m = Math.floor(sec / 60)
  const s = Math.ceil(sec % 60)
  return `${m}分${s}秒`
}

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
  /** 弹窗模式：下载 / 导出 IDM 链接 */
  const [progressMode, setProgressMode] = useState<'download' | 'export'>('download')
  /** 当前正在运行/最近完成的下载器实例，用于「取消」 */
  const activeDownloaderRef = useRef<AttachmentDownloader | null>(null)
  /** 用户是否点击了取消 */
  const cancelledRef = useRef(false)

  const [fileItems, setFileItems] = useState<Map<number, FileItem>>(new Map())
  const [totalFiles, setTotalFiles] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [packagingPercent, setPackagingPercent] = useState(0)
  const [isPackaging, setIsPackaging] = useState(false)
  const [detailTab, setDetailTab] = useState<'all' | 'running' | 'failed'>('all')
  const [downloadLog, setDownloadLog] = useState<string[]>([])

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
      downloadExecution: form.downloadExecution,
      ef2BasePath: form.ef2BasePath
    }

    setFileItems(new Map())
    setTotalFiles(0)
    setTotalBytes(0)
    setStartTime(Date.now())
    setPackagingPercent(0)
    setIsPackaging(false)
    setDetailTab('all')
    setDownloadLog([])
    setIsDownloading(true)
    setProgressOpen(true)
    setProgressMode('download')
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
          setTotalFiles(event.total)
          setTotalBytes(event.totalBytes)
          break
        case 'fileProgress':
          setFileItems((prev) => {
            const next = new Map(prev)
            next.set(event.item.index, event.item)
            return next
          })
          break
        case 'packaging':
          setIsPackaging(true)
          setPackagingPercent(event.percentage)
          break
        case 'error':
          setDownloadLog((l) => [...l, `失败 #${event.index}：${event.message}`])
          break
        case 'warn':
          setDownloadLog((l) => [...l, `警告：${event.message}`])
          break
        case 'info':
          setDownloadLog((l) => [...l, event.message])
          break
        case 'cancelled':
          setDownloadLog((l) => [...l, event.partialSaved ? '已取消，已打包已下载内容' : '已取消'])
          break
        case 'finished':
          setIsDownloading(false)
          setIsPackaging(false)
          activeDownloaderRef.current = null
          break
      }
    })

    await downloader.start(selectedRecordIds)
  }

  const handleExportEf2 = async () => {
    if (!form.tableId) {
      await showToast('请选择数据表', 'warning')
      return
    }
    if (!form.viewId) {
      await showToast('请选择视图', 'warning')
      return
    }
    if (form.attachmentFieldIds.length === 0) {
      await showToast('请先选择附件字段', 'warning')
      return
    }
    if (form.folderClassification) {
      if (form.folderLevels.length === 0) {
        await showToast('开启文件夹分类后，请至少添加一个目录层级', 'warning')
        return
      }
      if (form.folderLevels.some((l) => !l.fieldId)) {
        await showToast('请为每个目录层级选择字段', 'warning')
        return
      }
      if (!form.ef2BasePath.trim()) {
        await showToast('开启文件夹分类后，请填写 ef2 本地保存路径', 'warning')
        return
      }
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
      downloadExecution: form.downloadExecution,
      ef2BasePath: form.ef2BasePath
    }

    setFileItems(new Map())
    setTotalFiles(0)
    setTotalBytes(0)
    setStartTime(Date.now())
    setPackagingPercent(0)
    setIsPackaging(false)
    setDetailTab('all')
    setDownloadLog([])
    setIsDownloading(true)
    setProgressOpen(true)
    setProgressMode('export')
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
          setTotalFiles(event.total)
          setTotalBytes(event.totalBytes)
          break
        case 'fileProgress':
          setFileItems((prev) => {
            const next = new Map(prev)
            next.set(event.item.index, event.item)
            return next
          })
          break
        case 'error':
          setDownloadLog((l) => [...l, `失败 #${event.index}：${event.message}`])
          break
        case 'warn':
          setDownloadLog((l) => [...l, `警告：${event.message}`])
          break
        case 'info':
          setDownloadLog((l) => [...l, event.message])
          break
        case 'cancelled':
          setDownloadLog((l) => [...l, '已取消'])
          setIsDownloading(false)
          setIsPackaging(false)
          break
        case 'finished':
          setIsDownloading(false)
          setIsPackaging(false)
          activeDownloaderRef.current = null
          break
      }
    })

    try {
      const items = await downloader.collectEf2Items(selectedRecordIds)

      if (cancelledRef.current) {
        // 用户已取消，不导出文件
        return
      }

      if (items.length === 0) {
        await showToast('没有可导出的附件链接', 'warning')
        return
      }

      const stamp = new Date().toISOString().slice(0, 10)
      // 按「本地保存目录」分组去重文件名：同一目录下出现重名时，后续文件自动加 -1、-2（插入扩展名前）
      const usedNamesByFolder = new Map<string, Set<string>>()
      const ef2Lines = items.map((item) => {
        // ef2 文件格式约定：< 单独一行，URL 在下一行，字段行随后，> 单独一行
        // 参考 https://github.com/MotooriKashin/ef2
        const lines = ['<', item.url]
        if (item.folderPath) {
          // filepath 使用 Windows 单反斜杠路径，如 F:\Dir\Sub\
          lines.push(`filepath: ${item.folderPath}`)
        }
        let fileName = sanitizeFileName(item.displayName)
        if (!fileName) fileName = 'attachment'
        const folder = item.folderPath || ''
        const usedSet = usedNamesByFolder.get(folder) || new Set<string>()
        if (usedSet.has(fileName)) {
          const dot = fileName.lastIndexOf('.')
          const namePart = dot > 0 ? fileName.slice(0, dot) : fileName
          const extPart = dot > 0 ? fileName.slice(dot) : ''
          let idx = 1
          let candidate = `${namePart}-${idx}${extPart}`
          while (usedSet.has(candidate)) {
            idx += 1
            candidate = `${namePart}-${idx}${extPart}`
          }
          fileName = candidate
        }
        usedSet.add(fileName)
        usedNamesByFolder.set(folder, usedSet)
        lines.push(`filename: ${fileName}`)
        lines.push('>')
        return lines.join('\n')
      })
      const ef2Content = ef2Lines.join('\n')
      saveAs(new Blob([ef2Content], { type: 'text/plain;charset=utf-8' }), `IDM队列_${stamp}.ef2`)

      await showToast(
        `已导出 ${items.length} 个 IDM 队列条目（${scopeText}），同目录重名已自动加 -1/-2 序号；请双击 .ef2 文件用 IDM 下载，飞书直链有时效请尽快使用`,
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

          {form.folderClassification && (
            <div className="card">
              <div className="card-title">
                目录层级
                <Info tip="按字段值创建多级文件夹，ZIP 打包与导出 ef2 队列文件时均生效" />
              </div>
              <div className="form-row">
                <label className="form-label">
                  本地保存路径
                  <Info tip="IDM 下载时，附件将保存到该 Windows 目录下。例如：F:\\Downloads\\飞书附件" />
                </label>
                <div className="form-control">
                  <input
                    type="text"
                    placeholder="F:\\Downloads\\飞书附件"
                    value={form.ef2BasePath}
                    onChange={(e) => updateForm('ef2BasePath', e.target.value)}
                  />
                  <div className="hint">仅在导出 .ef2 队列文件时使用；留空则按 IDM 默认下载目录</div>
                </div>
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
            <button
              className="btn-secondary full"
              onClick={handleExportEf2}
              disabled={isDownloading}
              title="导出 IDM ef2 队列文件，双击即可拉起 IDM 并按配置的目录层级下载"
            >
              导出 IDM 队列文件（.ef2）
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

          <div className="version">当前版本 2.0.20</div>
        </div>
      )}

      {progressOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!isDownloading) setProgressOpen(false)
          }}
        >
          <div className="modal download-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{progressMode === 'export' ? '导出 IDM 队列文件（.ef2）' : '文件下载'}</h4>
              {!isDownloading && (
                <button className="close" onClick={() => setProgressOpen(false)}>
                  {Icons.close}
                </button>
              )}
            </div>
            <DownloadProgressBody
              progressMode={progressMode}
              isDownloading={isDownloading}
              isPackaging={isPackaging}
              fileItems={fileItems}
              totalFiles={totalFiles}
              totalBytes={totalBytes}
              startTime={startTime}
              packagingPercent={packagingPercent}
              detailTab={detailTab}
              setDetailTab={setDetailTab}
              downloadLog={downloadLog}
              onCancel={handleCancel}
              onClose={() => setProgressOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface DownloadProgressBodyProps {
  progressMode: 'download' | 'export'
  isDownloading: boolean
  isPackaging: boolean
  fileItems: Map<number, FileItem>
  totalFiles: number
  totalBytes: number
  startTime: number | null
  packagingPercent: number
  detailTab: 'all' | 'running' | 'failed'
  setDetailTab: (tab: 'all' | 'running' | 'failed') => void
  downloadLog: string[]
  onCancel: () => void
  onClose: () => void
}

function DownloadProgressBody({
  progressMode,
  isDownloading,
  isPackaging,
  fileItems,
  totalFiles,
  totalBytes,
  startTime,
  packagingPercent,
  detailTab,
  setDetailTab,
  downloadLog,
  onCancel,
  onClose
}: DownloadProgressBodyProps) {
  const items = useMemo(() => Array.from(fileItems.values()).sort((a, b) => a.index - b.index), [fileItems])

  const { completedCount, failedCount, loadedBytes } = useMemo(() => {
    let completed = 0
    let failed = 0
    let loaded = 0
    for (const item of items) {
      if (item.status === 'success') completed++
      if (item.status === 'failed' || item.status === 'cancelled') failed++
      loaded += item.loaded
    }
    return { completedCount: completed, failedCount: failed, loadedBytes: loaded }
  }, [items])

  const overallPercent = useMemo(() => {
    if (progressMode === 'export') {
      // 导出 ef2 不下载字节，进度按「已解析直链条数 / 总数」估算
      if (totalFiles <= 0) return 0
      return Math.min(100, Math.round((completedCount / totalFiles) * 100))
    }
    if (totalBytes <= 0) return 0
    return Math.min(100, Math.round((loadedBytes / totalBytes) * 100))
  }, [loadedBytes, totalBytes, completedCount, totalFiles, progressMode])

  const { speedText, etaText } = useMemo(() => {
    if (!startTime || loadedBytes <= 0) return { speedText: '--', etaText: '--' }
    const elapsed = (Date.now() - startTime) / 1000
    const speed = elapsed > 0 ? loadedBytes / elapsed : 0
    const remaining = totalBytes > loadedBytes ? totalBytes - loadedBytes : 0
    const eta = speed > 0 ? remaining / speed : 0
    return { speedText: formatSpeed(speed), etaText: formatSeconds(eta) }
  }, [startTime, loadedBytes, totalBytes])

  const isAllDone = !isDownloading && !isPackaging
  const headerStatus = useMemo(() => {
    if (isDownloading) return { text: progressMode === 'export' ? '生成 ef2 队列中...' : '下载中...', color: 'blue' }
    if (failedCount > 0 && completedCount === 0) return { text: '失败', color: 'red' }
    if (failedCount > 0) return { text: '部分完成', color: 'orange' }
    return { text: progressMode === 'export' ? '导出成功' : '下载成功', color: 'green' }
  }, [isDownloading, completedCount, failedCount, progressMode])

  const filteredItems = useMemo(() => {
    if (detailTab === 'running') return items.filter((i) => i.status === 'pending' || i.status === 'downloading')
    if (detailTab === 'failed') return items.filter((i) => i.status === 'failed' || i.status === 'cancelled')
    return items
  }, [items, detailTab])

  const runningCount = items.filter((i) => i.status === 'pending' || i.status === 'downloading').length

  return (
    <>
      <div className="modal-body download-modal-body">
        {/* 顶部状态卡片 */}
        <div className="download-status-card">
          <div className="download-status-left">
            <div className={`download-status-icon ${headerStatus.color}`}>{Icons.cloudDownload}</div>
            <div className="download-status-text">{headerStatus.text}</div>
          </div>
          <div className={`download-status-percent ${headerStatus.color}`}>{overallPercent}%</div>
        </div>
        <div className="download-progress-bar">
          <div
            className={`download-progress-fill ${headerStatus.color}`}
            style={{ width: `${overallPercent}%` }}
          />
        </div>

        {/* 统计网格 */}
        <div className="download-stats">
          <div className="download-stat">
            <div className="download-stat-label">文件总数</div>
            <div className="download-stat-value">{totalFiles}</div>
          </div>
          <div className="download-stat">
            <div className="download-stat-label">已完成</div>
            <div className="download-stat-value success">{completedCount}</div>
          </div>
          <div className="download-stat">
            <div className="download-stat-label">失败数量</div>
            <div className="download-stat-value fail">{failedCount}</div>
          </div>
          <div className="download-stat">
            <div className="download-stat-label">总大小</div>
            <div className="download-stat-value">{formatBytes(totalBytes)}</div>
          </div>
        </div>

        {/* 速度 / 剩余时间 */}
        <div className="download-metrics">
          <div className="download-metric">
            <span className="download-metric-icon">{Icons.download2}</span>
            <span className="download-metric-label">下载速度</span>
            <span className="download-metric-value">{speedText}</span>
          </div>
          <div className="download-metric">
            <span className="download-metric-icon">{Icons.info}</span>
            <span className="download-metric-label">剩余时间</span>
            <span className="download-metric-value">{etaText}</span>
          </div>
        </div>

        {/* 打包进度（ZIP 模式或导出模式不显示） */}
        {progressMode === 'download' && (isPackaging || packagingPercent > 0) && (
          <div className="packaging-section">
            <div className="packaging-label">打包文件生成中：{packagingPercent.toFixed(2)}%已完成。</div>
            <div className="download-progress-bar small">
              <div
                className="download-progress-fill green"
                style={{ width: `${packagingPercent}%` }}
              />
            </div>
            <div className="packaging-percent">{Math.round(packagingPercent)}%</div>
          </div>
        )}

        {/* 下载详情 */}
        {items.length > 0 && (
          <div className="download-details">
            <div className="download-details-header">
              <div className="download-details-title">下载详情</div>
            </div>
            <div className="download-details-tabs">
              <button className={detailTab === 'all' ? 'active' : ''} onClick={() => setDetailTab('all')}>
                全部
              </button>
              <button className={detailTab === 'running' ? 'active' : ''} onClick={() => setDetailTab('running')}>
                进行中{runningCount > 0 ? ` (${runningCount})` : ''}
              </button>
              <button className={detailTab === 'failed' ? 'active' : ''} onClick={() => setDetailTab('failed')}>
                失败
              </button>
            </div>
            <div className="download-file-list">
              {filteredItems.map((item) => (
                <div key={item.index} className={`download-file-item ${item.status}`}>
                  <div className="download-file-main">
                    <div className="download-file-name" title={item.name}>
                      {item.name}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="download-file-progress-row">
                    <div className="download-progress-bar tiny">
                      <div
                        className={`download-progress-fill ${item.status}`}
                        style={{ width: `${item.size > 0 ? Math.min(100, Math.round((item.loaded / item.size) * 100)) : 0}%` }}
                      />
                    </div>
                    <div className="download-file-percent">
                      {item.size > 0 ? Math.min(100, Math.round((item.loaded / item.size) * 100)) : 0}% · {formatBytes(item.size)}
                    </div>
                  </div>
                  {item.message && <div className="download-file-message">{item.message}</div>}
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="download-empty">暂无记录</div>
              )}
            </div>
          </div>
        )}

        {/* 简洁日志（保留关键警告/错误） */}
        {downloadLog.length > 0 && (
          <div className="download-log">
            {downloadLog.slice(-5).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
      <div className="modal-footer download-modal-footer">
        {isDownloading && (
          <button className="btn-secondary" onClick={onCancel}>
            取消
          </button>
        )}
        {isAllDone && (
          <button className="btn-primary" onClick={onClose}>
            完成
          </button>
        )}
      </div>
    </>
  )
}

function StatusBadge({ status }: { status: FileItem['status'] }) {
  const map: Record<FileItem['status'], { text: string; cls: string }> = {
    pending: { text: '等待中', cls: 'pending' },
    downloading: { text: '下载中', cls: 'downloading' },
    success: { text: '下载成功', cls: 'success' },
    failed: { text: '下载失败', cls: 'failed' },
    cancelled: { text: '已取消', cls: 'cancelled' }
  }
  const { text, cls } = map[status]
  return <span className={`download-status-badge ${cls}`}>{text}</span>
}
