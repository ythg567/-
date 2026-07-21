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
  nameDelimiter: string
  downloadMode: 'zip' | 'individual'
  folderClassification: boolean
  firstFolderFieldId?: string
  secondFolderFieldId?: string
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

export type DownloadEvent =
  | { type: 'pending'; total: number }
  | { type: 'progress'; index: number; name: string; size: number; percentage: number }
  | { type: 'error'; index: number; message: string }
  | { type: 'warn'; message: string }
  | { type: 'info'; message: string }
  | { type: 'finished' }

export type EventCallback = (event: DownloadEvent) => void

export interface IRecord {
  recordId: string
  fields: Record<string, any>
}

export interface BitableApis {
  fetchRecords: (tableId: string, viewId: string, selectedRecordId?: string) => Promise<IRecord[]>
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

export class AttachmentDownloader {
  private config: DownloadConfig
  private apis: BitableApis
  private listeners: EventCallback[] = []
  private cellList: AttachmentItem[] = []
  private usedNames = new Set<string>()
  private zipName: string

  constructor(config: DownloadConfig, apis: BitableApis, zipName: string) {
    this.config = config
    this.apis = apis
    this.zipName = zipName
  }

  on(event: EventCallback) {
    this.listeners.push(event)
  }

  private emit(event: DownloadEvent) {
    this.listeners.forEach((fn) => fn(event))
  }

  async start(selectedRecordId?: string) {
    this.usedNames.clear()
    this.emit({ type: 'info', message: '正在读取记录...' })

    const records = await this.apis.fetchRecords(
      this.config.tableId,
      this.config.viewId,
      selectedRecordId
    )

    this.buildCellList(records)
    await this.applyFileNames()
    await this.applyFolderPath()

    if (this.cellList.length === 0) {
      this.emit({ type: 'info', message: '没有需要下载的附件。' })
      this.emit({ type: 'finished' })
      return
    }

    this.emit({ type: 'pending', total: this.cellList.length })

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

  private buildCellList(records: IRecord[]) {
    const list: AttachmentItem[] = []
    let order = 1
    for (const record of records) {
      for (const fieldId of this.config.attachmentFieldIds) {
        const cell = record.fields[fieldId]
        if (!Array.isArray(cell)) continue
        for (const att of cell) {
          if (!att?.token || !att?.name) continue
          list.push({
            token: att.token,
            name: sanitizeFileName(att.name),
            size: att.size || 0,
            type: att.type || '',
            recordId: record.recordId,
            fieldId,
            order: order++,
            path: '',
            displayName: sanitizeFileName(att.name)
          })
        }
      }
    }
    this.cellList = list
  }

  private async applyFileNames() {
    if (this.config.fileNameType === 'original') return

    const { fileNameFieldIds, nameDelimiter } = this.config
    if (fileNameFieldIds.length === 0) return

    await Promise.all(
      this.cellList.map(async (cell) => {
        const names = await Promise.all(
          fileNameFieldIds.map((fieldId) =>
            this.apis.getCellString(this.config.tableId, fieldId, cell.recordId)
          )
        )
        const joined = names.filter(Boolean).join(nameDelimiter || '-')
        if (joined) {
          cell.displayName = replaceFileName(cell.name, joined, '未命名')
        }
      })
    )
  }

  private async applyFolderPath() {
    if (this.config.downloadMode !== 'zip' || !this.config.folderClassification) return

    const { firstFolderFieldId, secondFolderFieldId } = this.config
    if (!firstFolderFieldId && !secondFolderFieldId) return

    await Promise.all(
      this.cellList.map(async (cell) => {
        const parts: string[] = []
        if (firstFolderFieldId) {
          const raw = await this.apis.getCellString(this.config.tableId, firstFolderFieldId, cell.recordId)
          parts.push(getFolderName(raw))
        }
        if (secondFolderFieldId) {
          const raw = await this.apis.getCellString(this.config.tableId, secondFolderFieldId, cell.recordId)
          parts.push(getFolderName(raw))
        }
        cell.path = parts.filter(Boolean).map((p) => `${p}/`).join('')
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
    try {
      // 飞书临时链接可能在下载过程中过期，失败自动重试以换取更稳定的成功率
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
    for (const cell of this.cellList) {
      const blob = await this.fetchFile(cell)
      if (!blob) continue

      const finalName = getUniqueName(cell.displayName, '', this.usedNames)
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = finalName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)

      // 浏览器批量下载之间稍作间隔，降低被拦截概率
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  private async downloadAsZip() {
    const zip = new JSZip()
    for (const cell of this.cellList) {
      const blob = await this.fetchFile(cell)
      if (!blob) continue

      const finalName = getUniqueName(cell.displayName, cell.path, this.usedNames)
      zip.file(`${cell.path}${finalName}`, blob)
    }

    this.emit({ type: 'info', message: '正在生成 ZIP...' })
    const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      this.emit({ type: 'progress', index: 0, name: '打包中', size: 0, percentage: Number(metadata.percent.toFixed(1)) })
    })
    saveAs(content, `${this.zipName}.zip`)
  }
}
