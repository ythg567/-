import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useBitable,
  IFieldMeta,
  IViewMeta,
  isAttachmentField,
  SUPPORT_TEXT_TYPES,
  FieldType
} from './hooks/useBitable'
import { usePresets, FormState } from './hooks/usePresets'
import {
  AttachmentDownloader,
  DownloadConfig,
  DownloadEvent
} from './utils/download'

// Inline SVG icons (no extra dependency)
const Icons = {
  download: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-6 2h12v2H6v-2z" />
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
  check: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  )
}

type Tab = 'download' | 'my'

const defaultForm: FormState = {
  tableId: '',
  viewId: '',
  attachmentFieldIds: [],
  urlFieldId: '',
  fileNameType: 'original',
  fileNameFieldIds: [],
  nameDelimiter: '-',
  downloadMode: 'zip',
  folderClassification: false,
  firstFolderFieldId: '',
  secondFolderFieldId: ''
}

function Info({ tip }: { tip: string }) {
  return (
    <span className="info-icon" title={tip}>
      {Icons.info}
    </span>
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

  const activeTable = useMemo(
    () => (form.tableId ? getTableInfo(form.tableId) : null),
    [form.tableId, getTableInfo]
  )

  const views = useMemo<IViewMeta[]>(() => activeTable?.viewMetaList || [], [activeTable])
  const fields = useMemo<IFieldMeta[]>(() => activeTable?.fieldMetaList || [], [activeTable])
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

  useEffect(() => {
    if (!activeTable) return

    setForm((prev) => {
      const next = { ...prev }
      const viewExists = views.some((v) => v.id === prev.viewId)
      if (!viewExists) {
        next.viewId = selection.viewId && views.some((v) => v.id === selection.viewId)
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
    const name = window.prompt('请输入新预设名称：', `预设 ${presets.length + 1}`)
    if (!name || !name.trim()) return
    saveNew(name.trim())
    showToast('已保存为新预设', 'success')
  }

  const handleOverwritePreset = () => {
    if (!selectedId) {
      showToast('请先选择一个预设', 'warning')
      return
    }
    const preset = presets.find((p) => p.id === selectedId)
    if (!preset) return
    if (window.confirm(`确定用当前配置覆盖预设「${preset.name}」吗？`)) {
      overwrite(selectedId)
      showToast('已覆盖所选预设', 'success')
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
      remove(selectedId)
      showToast('已删除所选预设', 'success')
    }
  }

  const handleExportPresets = () => {
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
      // reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const validate = (): string | null => {
    if (!form.tableId) return '请选择数据表'
    if (!form.viewId) return '请选择视图'
    if (form.attachmentFieldIds.length === 0) return '请至少选择一个附件字段'
    if (form.fileNameType === 'field' && form.fileNameFieldIds.length === 0) {
      return '请选择用于命名的字段'
    }
    if (form.folderClassification && !form.firstFolderFieldId && !form.secondFolderFieldId) {
      return '开启文件夹分类后，请至少选择一级或二级目录字段'
    }
    if (form.firstFolderFieldId && form.firstFolderFieldId === form.secondFolderFieldId) {
      return '一级目录与二级目录不能相同'
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

    if (selectedOnly && !selection.recordId) {
      await showToast('当前没有选中的记录', 'warning')
      return
    }

    const config: DownloadConfig = {
      tableId: form.tableId,
      viewId: form.viewId,
      attachmentFieldIds: form.attachmentFieldIds,
      fileNameType: form.fileNameType,
      fileNameFieldIds: form.fileNameFieldIds,
      nameDelimiter: form.nameDelimiter,
      downloadMode: form.downloadMode,
      folderClassification: form.folderClassification,
      firstFolderFieldId: form.firstFolderFieldId,
      secondFolderFieldId: form.secondFolderFieldId
    }

    setProgress({ total: 0, completed: 0, failed: 0, currentName: '', currentPercentage: 0 })
    setLog([])
    setIsDownloading(true)
    setProgressOpen(true)

    const downloader = new AttachmentDownloader(
      config,
      { fetchRecords, getCellString, getAttachmentUrl },
      activeTable?.name || '附件下载'
    )

    downloader.on((event: DownloadEvent) => {
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
        case 'finished':
          setIsDownloading(false)
          break
      }
    })

    await downloader.start(selectedOnly ? selection.recordId : undefined)
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
      <div className="tabs">
        <button
          className={activeTab === 'download' ? 'active' : ''}
          onClick={() => setActiveTab('download')}
        >
          <span className="tab-icon">{Icons.download}</span>
          下载
        </button>
        <button
          className={activeTab === 'my' ? 'active' : ''}
          onClick={() => setActiveTab('my')}
        >
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
                  data-tip="保存当前配置为新预设"
                  onClick={handleSaveNewPreset}
                >
                  {Icons.save}
                </button>
                <button
                  type="button"
                  data-tip="用当前配置覆盖所选预设"
                  onClick={handleOverwritePreset}
                  disabled={!selectedId}
                >
                  {Icons.edit}
                </button>
                <button
                  type="button"
                  data-tip="从 JSON 文件导入预设"
                  onClick={handleImportClick}
                >
                  {Icons.upload}
                </button>
                <button
                  type="button"
                  data-tip="导出预设"
                  onClick={handleExportPresets}
                  disabled={presets.length === 0}
                >
                  {Icons.download2}
                </button>
                <button
                  type="button"
                  data-tip="删除所选预设"
                  onClick={handleDeletePreset}
                  disabled={!selectedId}
                  className="danger"
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
              <label className="form-label">数据表</label>
              <div className="form-control">
                <select
                  value={form.tableId}
                  onChange={(e) => updateForm('tableId', e.target.value)}
                >
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
                视图
                <Info tip="只会下载当前视图中可见的记录" />
              </label>
              <div className="form-control">
                <select
                  value={form.viewId}
                  onChange={(e) => updateForm('viewId', e.target.value)}
                >
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
                <select
                  multiple
                  value={form.attachmentFieldIds}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions).map((o) => o.value)
                    updateForm('attachmentFieldIds', options)
                  }}
                >
                  {attachmentFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <div className="hint">按住 Ctrl/Cmd 可选择多个字段</div>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">
                URL 字段
                <Info tip="预留字段，当前版本仅做展示" />
              </label>
              <div className="form-control">
                <select
                  value={form.urlFieldId}
                  onChange={(e) => updateForm('urlFieldId', e.target.value)}
                >
                  <option value="">请选择 URL 字段</option>
                  {urlFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="advanced-toggle"
              onClick={() => setAdvancedOpen((v) => !v)}
            >
              高级设置
              <span className={`advanced-chevron ${advancedOpen ? 'open' : ''}`}>▼</span>
            </button>

            {advancedOpen && (
              <div className="advanced-body">
                <div className="form-row">
                  <label className="form-label">并发数</label>
                  <div className="form-control">
                    <input type="number" min={1} max={20} defaultValue={3} disabled />
                    <div className="hint">浏览器模式下为串行下载，避免触发限流</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 命名与分类 */}
          <div className="card">
            <div className="form-row">
              <label className="form-label">文件命名方式</label>
              <div className="form-control">
                <select
                  value={form.fileNameType}
                  onChange={(e) =>
                    updateForm('fileNameType', e.target.value as 'original' | 'field')
                  }
                >
                  <option value="original">原文件名称</option>
                  <option value="field">从表字段选择</option>
                </select>
              </div>
            </div>

            {form.fileNameType === 'field' && (
              <>
                <div className="form-row">
                  <label className="form-label">
                    字段列
                    <Info tip="可选择一个或多个字段组合为文件名" />
                  </label>
                  <div className="form-control">
                    <select
                      multiple
                      value={form.fileNameFieldIds}
                      onChange={(e) => {
                        const options = Array.from(e.target.selectedOptions).map((o) => o.value)
                        updateForm('fileNameFieldIds', options)
                      }}
                    >
                      {textFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">字段连接符</label>
                  <div className="form-control">
                    <input
                      type="text"
                      value={form.nameDelimiter}
                      onChange={(e) => updateForm('nameDelimiter', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-row">
              <label className="form-label">
                文件夹分类
                <Info tip="仅在 ZIP 打包下载时生效" />
              </label>
              <div className="form-control inline">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={form.folderClassification}
                    onChange={(e) => updateForm('folderClassification', e.target.checked)}
                  />
                  <span className="slider" />
                </label>
                <span className="switch-label">{form.folderClassification ? '是' : '否'}</span>
              </div>
            </div>

            {form.folderClassification && form.downloadMode === 'zip' && (
              <>
                <div className="form-row">
                  <label className="form-label">一级目录</label>
                  <div className="form-control">
                    <select
                      value={form.firstFolderFieldId}
                      onChange={(e) => updateForm('firstFolderFieldId', e.target.value)}
                    >
                      <option value="">请选择</option>
                      {textFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">二级目录</label>
                  <div className="form-control">
                    <select
                      value={form.secondFolderFieldId}
                      onChange={(e) => updateForm('secondFolderFieldId', e.target.value)}
                    >
                      <option value="">请选择</option>
                      {textFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

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
                  onChange={(e) =>
                    updateForm('downloadMode', e.target.value as 'zip' | 'individual')
                  }
                >
                  <option value="zip">zip 打包下载</option>
                  <option value="individual">单独下载</option>
                </select>
              </div>
            </div>
          </div>

          <div className="footer-actions">
            <button
              className="btn-secondary"
              onClick={() => handleDownload(true)}
              disabled={isDownloading}
            >
              下载所选记录
            </button>
            <button
              className="btn-primary"
              onClick={() => handleDownload(false)}
              disabled={isDownloading}
            >
              下载全部记录
              <span className="btn-icon">{Icons.download}</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'my' && (
        <div className="panel about">
          <div className="card">
            <div className="card-title">关于插件</div>
            <p>飞书多维表格附件批量下载插件</p>
            <p className="muted">版本：1.0.0</p>
            <ul>
              <li>批量下载当前视图中可见记录的附件</li>
              <li>支持原文件名或按字段值重命名</li>
              <li>支持 ZIP 打包并按字段分文件夹</li>
              <li>支持下载单条选中记录</li>
            </ul>
            <div className="hint">如需本地客户端/WebSocket 下载模式，可在此基础上扩展。</div>
          </div>
        </div>
      )}

      {progressOpen && (
        <div className="modal-overlay" onClick={() => { if (!isDownloading) setProgressOpen(false) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>下载进度</h4>
              {!isDownloading && (
                <button className="close" onClick={() => setProgressOpen(false)}>{Icons.close}</button>
              )}
            </div>
            <div className="modal-body">
              <div className="stat-row">
                <span>总数：{progress.total}</span>
                <span>成功：{progress.completed}</span>
                <span>失败：{progress.failed}</span>
              </div>
              {progress.currentName && (
                <div className="current-file">
                  <div className="file-name" title={progress.currentName}>
                    {progress.currentName}
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${progress.currentPercentage}%` }}
                    />
                  </div>
                  <div className="progress-text">{progress.currentPercentage}%</div>
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
