import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import {
  sanitizeFileName,
  replaceFileName,
  getFolderName,
  getUniqueName
} from './fileName'

export interface DownloadConfig {
  tableId: string
  viewId: string
  attachmentFieldIds: string[]
  fileNameType: 'original' | 'field'
  fileNameFieldIds: string[]
  fileNameOrderIds?: string[]
  nameDelimiter: string
  downloadMode: 'zip' | 'individual'
  folderClassification: boolean
  /** 多级目录字段，顺序即目录层级 */
  folderLevels: { fieldId: string }[]
  /** 是否同时导出记录内容文本文件 */
  recordContent: boolean
  /** 记录内容导出格式 */
  exportFormat: 'txt' | 'md' | 'json'
  /** 要导出到记录内容中的字段 */
  exportFieldIds: string[]
  /** 是否在记录内容中显示字段名 */
  showFieldName: boolean
  /** 字段之间是否保留空行 */
  keepBlankLine: boolean
  /** 是否忽略空字段 */
  ignoreEmptyField: boolean
  /** 空字段处理方式 */
  emptyFieldHandling: 'ignore' | 'keep'
  /** 同时下载的文件并发数 */
  concurrency: number
  /** 下载执行方式，当前仅支持浏览器直接下载 */
  downloadExecution: 'browser'
}

export interface AttachmentItem {
  token: string
  name: string
  size: number
  type: string
  recordId: string
  fieldId: string
  order: number
  path: string
  displayName: string
  fileUrl?: string
}

export interface RecordExportItem {
  recordId: string
  path: string
  displayName: string
  order: number
  content: string
  ext: string
}

export type DownloadEvent =
  | { type: 'pending'; total: number }
  | { type: 'progress'; index: number; name: string; size: number; percentage: number }
  | { type: 'error'; index: number; message: string }
  | { type: 'warn'; message: string }
  | { type: 'info'; message: string }
  | { type: 'cancelled' }
  | { type: 'finished' }

export type EventCallback = (event: DownloadEvent) => void

export interface IRecord {
  recordId: string
  fields: Record<string, any>
}

export interface BitableApis {
  fetchRecords: (tableId: string, viewId: string, selectedRecordIds?: string[]) => Promise<IRecord[]>
  getCellString: (tableId: string, fieldId: string, recordId: string) => Promise<string>
  getAttachmentUrl: (tableId: string, token: string, fieldId: string, recordId: string) => Promise<string>
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 800): Promise<T> {
  let lastErr: any
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < retries) await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw lastErr
}

/**
 * 并发执行：最多同时运行 limit 个异步任务，保持结果顺序与输入一致。
 * 用于把「串行下载」改为「并行下载」，大幅提升多文件场景的吞吐。
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  iterator: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await iterator(items[i], i)
    }
  }
  const n = Math.max(1, Math.min(limit || 1, items.length))
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}

export class AttachmentDownloader {
  private config: DownloadConfig
  private apis: BitableApis
  private listeners: EventCallback[] = []
  private cellList: AttachmentItem[] = []
  private recordList: RecordExportItem[] = []
  private usedNames = new Set<string>()
  private zipName: string
  private fieldMap: Map<string, string> = new Map()
  /** 取消标志：cancel() 后所有正在进行的任务应尽快停止 */
  private cancelled = false

  constructor(config: DownloadConfig, apis: BitableApis, zipName: string, fieldMap?: Map<string, string>) {
    this.config = config
    this.apis = apis
    this.zipName = zipName
    if (fieldMap) this.fieldMap = fieldMap
  }

  on(event: EventCallback) {
    this.listeners.push(event)
  }

  /** 请求取消当前下载/导出。已发起的取链/拉取会尽快中止。 */
  cancel() {
    this.cancelled = true
  }

  private emit(event: DownloadEvent) {
    this.listeners.forEach((fn) => fn(event))
  }

  private isCancelled() {
    return this.cancelled
  }

  async start(selectedRecordIds?: string[]) {
    this.usedNames.clear()
    this.cellList = []
    this.recordList = []
    this.emit({ type: 'info', message: '正在读取记录...' })

    const records = await this.apis.fetchRecords(
      this.config.tableId,
      this.config.viewId,
      selectedRecordIds
    )
    if (this.isCancelled()) {
      this.emit({ type: 'cancelled' })
      this.emit({ type: 'finished' })
      return
    }

    this.buildLists(records)
    await this.applyFileNames()
    await this.applyFolderPath()

    const total = this.cellList.length + this.recordList.length
    if (total === 0) {
      this.emit({ type: 'info', message: '没有需要下载的内容。' })
      this.emit({ type: 'finished' })
      return
    }

    this.emit({ type: 'pending', total })

    try {
      if (this.config.downloadMode === 'zip') {
        await this.downloadAsZip()
      } else {
        await this.downloadIndividual()
      }
    } catch (err: any) {
      this.emit({ type: 'warn', message: err?.message || '下载过程出现错误' })
    } finally {
      this.emit({ type: 'finished' })
    }
  }

  private buildCells(records: IRecord[]) {
    for (const record of records) {
      for (const fieldId of this.config.attachmentFieldIds) {
        const cell = record.fields[fieldId]
        if (!Array.isArray(cell)) continue
        for (const att of cell) {
          if (!att?.token || !att?.name) continue
          this.cellList.push({
            token: att.token,
            name: sanitizeFileName(att.name),
            size: att.size || 0,
            type: att.type || '',
            recordId: record.recordId,
            fieldId,
            order: 0,
            path: '',
            displayName: sanitizeFileName(att.name)
          })
        }
      }
    }
  }

  private buildRecordExports(records: IRecord[]) {
    if (!this.config.recordContent || this.config.exportFieldIds.length === 0) return
    let order = 1
    for (const record of records) {
      const content = this.buildRecordContent(record)
      if (!content) continue
      const ext =
        this.config.exportFormat === 'md' ? '.md' : this.config.exportFormat === 'json' ? '.json' : '.txt'
      this.recordList.push({
        recordId: record.recordId,
        path: '',
        displayName: `记录内容${ext}`,
        order: order++,
        content,
        ext
      })
    }
  }

  private buildLists(records: IRecord[]) {
    this.cellList = []
    this.recordList = []
    this.buildCells(records)
    this.buildRecordExports(records)
    // 分配稳定且唯一的序号，便于并发下载时进度/日志定位
    let i = 1
    for (const c of this.cellList) c.order = i++
    for (const r of this.recordList) r.order = i++
  }

  private buildRecordContent(record: IRecord): string {
    const { exportFormat, exportFieldIds, showFieldName, keepBlankLine, ignoreEmptyField, emptyFieldHandling } = this.config
    const lines: string[] = []
    const jsonObj: Record<string, string> = {}

    for (const fieldId of exportFieldIds) {
      const fieldName = this.fieldMap.get(fieldId) || fieldId
      const rawValue = record.fields[fieldId]
      // 简单文本化：数组取第一个文本，对象取 name，其他直接 toString
      let value = ''
      if (Array.isArray(rawValue) && rawValue.length > 0) {
        value = String(rawValue[0]?.text ?? rawValue[0]?.name ?? rawValue[0] ?? '')
      } else if (rawValue && typeof rawValue === 'object') {
        value = String(rawValue.text ?? rawValue.name ?? '')
      } else if (rawValue != null) {
        value = String(rawValue)
      }

      const isEmpty = value.trim() === ''
      if (isEmpty && ignoreEmptyField && emptyFieldHandling === 'ignore') {
        continue
      }

      if (exportFormat === 'json') {
        jsonObj[fieldName] = value
      } else {
        // txt / md
        if (showFieldName) {
          lines.push(`${fieldName}：${value}`)
        } else {
          lines.push(value)
        }
        if (keepBlankLine) {
          lines.push('')
        }
      }
    }

    if (exportFormat === 'json') {
      return JSON.stringify(jsonObj, null, 2)
    }
    // 如果最后多了一个空行，去掉
    if (keepBlankLine && lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
    }
    return lines.join('\n')
  }

  private async applyFileNames() {
    const { fileNameType, fileNameFieldIds, fileNameOrderIds, nameDelimiter } = this.config
    if (fileNameType === 'original') {
      // 记录内容文件仍需按记录重命名
      await this.applyRecordDisplayNames()
      return
    }

    if (fileNameFieldIds.length === 0) {
      await this.applyRecordDisplayNames()
      return
    }

    const orderedIds =
      fileNameOrderIds && fileNameOrderIds.length > 0
        ? fileNameOrderIds.filter((id) => fileNameFieldIds.includes(id))
        : fileNameFieldIds

    // 先给每个记录计算一次文件名，避免重复请求
    const recordNameMap = new Map<string, string>()
    const records = new Set([...this.cellList, ...this.recordList].map((i) => i.recordId))
    for (const recordId of records) {
      const names = await Promise.all(
        orderedIds.map((fieldId) =>
          this.apis.getCellString(this.config.tableId, fieldId, recordId)
        )
      )
      const joined = names.filter(Boolean).join(nameDelimiter || '-')
      recordNameMap.set(recordId, joined)
    }

    for (const cell of this.cellList) {
      const base = recordNameMap.get(cell.recordId)
      if (base) {
        cell.displayName = replaceFileName(cell.name, base, '未命名')
      }
    }

    for (const rec of this.recordList) {
      const base = recordNameMap.get(rec.recordId)
      if (base) {
        rec.displayName = `${sanitizeFileName(base)}${rec.ext}`
      }
    }
  }

  private async applyRecordDisplayNames() {
    for (const rec of this.recordList) {
      // 如果没有字段命名，使用记录 ID 后缀避免同名
      rec.displayName = `记录内容_${rec.recordId.slice(-6)}${rec.ext}`
    }
  }

  private async applyFolderPath() {
    if (this.config.downloadMode !== 'zip' || !this.config.folderClassification) return
    if (!this.config.folderLevels || this.config.folderLevels.length === 0) return

    const items = [...this.cellList, ...this.recordList]
    await Promise.all(
      items.map(async (item) => {
        const parts: string[] = []
        for (const level of this.config.folderLevels) {
          if (!level.fieldId) continue
          const raw = await this.apis.getCellString(this.config.tableId, level.fieldId, item.recordId)
          const folder = getFolderName(raw)
          if (folder) parts.push(folder)
        }
        item.path = parts.filter(Boolean).map((p) => `${p}/`).join('')
      })
    )
  }

  private async resolveUrl(cell: AttachmentItem) {
    const url = await this.apis.getAttachmentUrl(
      this.config.tableId,
      cell.token,
      cell.fieldId,
      cell.recordId
    )
    if (!url) throw new Error('无法获取附件下载链接')
    cell.fileUrl = url
  }

  private async downloadBlob(url: string, onProgress: (p: number) => void): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.responseType = 'blob'
      xhr.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response)
        } else {
          reject(new Error(`下载失败，HTTP ${xhr.status}`))
        }
      }
      xhr.onerror = () => reject(new Error('网络请求失败，可能被跨域策略拦截'))
      xhr.ontimeout = () => reject(new Error('下载超时'))
      xhr.send()
    })
  }

  private async fetchFile(cell: AttachmentItem): Promise<Blob | null> {
    this.emit({ type: 'progress', index: cell.order, name: cell.displayName, size: cell.size, percentage: 0 })
    if (this.isCancelled()) {
      this.emit({ type: 'error', index: cell.order, message: '已取消' })
      return null
    }
    try {
      await withRetry(() => this.resolveUrl(cell))
      const blob = await withRetry(() =>
        this.downloadBlob(cell.fileUrl!, (percentage) => {
          this.emit({
            type: 'progress',
            index: cell.order,
            name: cell.displayName,
            size: cell.size,
            percentage
          })
        })
      )
      this.emit({ type: 'progress', index: cell.order, name: cell.displayName, size: cell.size, percentage: 100 })
      return blob
    } catch (err: any) {
      this.emit({ type: 'error', index: cell.order, message: err?.message || '下载失败' })
      return null
    }
  }

  private async downloadIndividual() {
    const limit = Math.max(1, this.config.concurrency || 6)
    // 并发拉取所有附件字节（网络瓶颈在此并行化），下载本身仍按顺序触发以免浏览器拦截
    const blobs = await mapWithConcurrency(this.cellList, limit, (cell) => this.fetchFile(cell))

    for (let i = 0; i < this.cellList.length; i++) {
      const cell = this.cellList[i]
      const blob = blobs[i]
      if (!blob) continue
      const finalName = getUniqueName(cell.displayName, '', this.usedNames)
      this.triggerDownload(blob, finalName)
      await new Promise((r) => setTimeout(r, 120))
    }

    for (const rec of this.recordList) {
      const blob = new Blob([rec.content], { type: 'text/plain;charset=utf-8' })
      const finalName = getUniqueName(rec.displayName, '', this.usedNames)
      this.triggerDownload(blob, finalName)
      await new Promise((r) => setTimeout(r, 120))
    }
  }

  private async downloadAsZip() {
    const limit = Math.max(1, this.config.concurrency || 6)
    // 并发拉取所有附件字节，再统一打包
    const blobs = await mapWithConcurrency(this.cellList, limit, (cell) => this.fetchFile(cell))

    const zip = new JSZip()
    for (let i = 0; i < this.cellList.length; i++) {
      const cell = this.cellList[i]
      const blob = blobs[i]
      if (!blob) continue
      const finalName = getUniqueName(cell.displayName, cell.path, this.usedNames)
      zip.file(`${cell.path}${finalName}`, blob)
    }
    for (const rec of this.recordList) {
      const blob = new Blob([rec.content], { type: 'text/plain;charset=utf-8' })
      const finalName = getUniqueName(rec.displayName, rec.path, this.usedNames)
      zip.file(`${rec.path}${finalName}`, blob)
    }

    this.emit({ type: 'info', message: '正在生成 ZIP...' })
    const content = await zip.generateAsync(
      { type: 'blob' },
      (metadata) => {
        this.emit({ type: 'progress', index: 0, name: '打包中', size: 0, percentage: Number(metadata.percent.toFixed(1)) })
      }
    )
    if (this.isCancelled()) {
      this.emit({ type: 'cancelled' })
      return
    }
    saveAs(content, `${this.zipName}.zip`)
  }

  /**
   * 收集所有附件的「当前有效下载直链」，供外部下载工具（如 IDM）批量导入。
   * 注意：飞书签名链接有时效，应在导出后尽快使用。
   */
  async collectAttachmentLinks(
    selectedRecordIds?: string[]
  ): Promise<{ displayName: string; url: string; recordId: string }[]> {
    this.cellList = []
    const records = await this.apis.fetchRecords(
      this.config.tableId,
      this.config.viewId,
      selectedRecordIds
    )
    if (this.isCancelled()) {
      this.emit({ type: 'cancelled' })
      return []
    }
    this.buildCells(records)
    if (this.cellList.length === 0) return []

    this.emit({ type: 'pending', total: this.cellList.length })
    this.emit({ type: 'info', message: `正在获取 ${this.cellList.length} 个附件的下载直链...` })

    // 解析直链时控制并发（避免触发飞书接口限流）
    const limit = Math.max(1, Math.min(this.config.concurrency || 6, 5))
    let done = 0
    await mapWithConcurrency(this.cellList, limit, async (cell) => {
      if (this.isCancelled()) return
      try {
        await this.resolveUrl(cell)
      } catch {
        cell.fileUrl = undefined
      }
      done++
      this.emit({
        type: 'progress',
        index: cell.order,
        name: cell.displayName,
        size: cell.size,
        percentage: Math.round((done / this.cellList.length) * 100)
      })
    })

    if (this.isCancelled()) {
      this.emit({ type: 'cancelled' })
      return []
    }

    return this.cellList
      .filter((c) => c.fileUrl)
      .map((c) => ({ displayName: c.displayName, url: c.fileUrl as string, recordId: c.recordId }))
  }

  private triggerDownload(blob: Blob, fileName: string) {
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  }
}
