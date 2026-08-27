import { useEffect, useState, useCallback } from 'react'
import { bitable, FieldType } from '@lark-base-open/js-sdk'

export { FieldType }

export interface IFieldMeta {
  id: string
  name: string
  type: number
  property?: any
}

export interface IViewMeta {
  id: string
  name: string
}

export interface ITableInfo {
  id: string
  name: string
  table: any
  fieldMetaList: IFieldMeta[]
  viewMetaList: IViewMeta[]
  /** 每个视图对应的「字段列显示顺序」（视图字段列表为有序），用于下拉框按表格列顺序展示 */
  viewFieldOrders: Record<string, string[]>
}

export interface IAttachmentFile {
  token: string
  name: string
  size: number
  type: string
  recordId: string
  fieldId: string
}

export interface IRecord {
  recordId: string
  fields: Record<string, any>
}

const SUPPORT_TEXT_FIELD_NAMES = [
  'Formula',
  'AutoNumber',
  'Barcode',
  'CreatedTime',
  'SingleSelect',
  'CreatedUser',
  'DateTime',
  'Location',
  'ModifiedTime',
  'ModifiedUser',
  'Number',
  'Phone',
  'Text',
  'Url',
  'User'
]

export const SUPPORT_TEXT_TYPES = SUPPORT_TEXT_FIELD_NAMES.map(
  (name) => (FieldType as any)[name]
).filter((v) => typeof v === 'number')

export function sortByOrder<T extends { id: string }>(target: T[], orderSource: { id: string }[]) {
  const orderMap = new Map(orderSource.map((item, index) => [item.id, index]))
  return [...target].sort((a, b) => {
    const ia = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity
    const ib = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity
    return ia - ib
  })
}

export function useBitable() {
  const [loading, setLoading] = useState(true)
  const [tableInfoList, setTableInfoList] = useState<ITableInfo[]>([])
  const [selection, setSelection] = useState<{ tableId?: string; viewId?: string; baseId?: string; recordId?: string }>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        const sel = await bitable.base.getSelection()
        let tableMetaList = await bitable.base.getTableMetaList()
        tableMetaList = (tableMetaList || []).filter((t: any) => !!t.name)

        const infos: ITableInfo[] = []
        for (const meta of tableMetaList) {
          const table = await bitable.base.getTableById(meta.id)
          const fieldMetaList = await table.getFieldMetaList()
          const viewMetaList = await table.getViewMetaList()
          // 拉取每个视图的字段列显示顺序（视图字段列表为有序），用于下拉框排序
          const viewFieldOrders: Record<string, string[]> = {}
          for (const v of viewMetaList) {
            try {
              const view = await table.getViewById(v.id)
              const vFields = (await view.getFieldMetaList()) || []
              viewFieldOrders[v.id] = vFields.map((f: any) => f.id)
            } catch {
              viewFieldOrders[v.id] = []
            }
          }
          infos.push({
            id: meta.id,
            name: meta.name,
            table,
            fieldMetaList,
            viewMetaList,
            viewFieldOrders
          })
        }

        if (!mounted) return
        setTableInfoList(infos)
        setSelection({
          tableId: sel?.tableId || infos[0]?.id || '',
          viewId: sel?.viewId || '',
          baseId: sel?.baseId || '',
          recordId: sel?.recordId || ''
        })
      } catch (err: any) {
        if (mounted) setError(err?.message || '初始化失败')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [])

  const getTableInfo = useCallback(
    (tableId: string) => tableInfoList.find((t) => t.id === tableId) || null,
    [tableInfoList]
  )

  const fetchRecords = useCallback(
    async (tableId: string, viewId: string, selectedRecordIds?: string[]): Promise<IRecord[]> => {
      const info = getTableInfo(tableId)
      if (!info) return []

      // 只下载勾选的多条记录
      if (selectedRecordIds && selectedRecordIds.length > 0) {
        const recs = await Promise.all(
          selectedRecordIds.map((id) => info.table.getRecordById(id))
        )
        return recs.map((rec, idx) => ({
          recordId: selectedRecordIds[idx],
          fields: rec?.fields || {}
        }))
      }

      const list: IRecord[] = []
      let pageToken: string | undefined
      do {
        const res = await info.table.getRecords({
          pageSize: 5000,
          viewId: viewId || undefined,
          pageToken
        })
        if (res?.records) {
          list.push(...res.records)
        }
        pageToken = res?.pageToken
        if (!res?.hasMore) break
      } while (pageToken)
      return list
    },
    [getTableInfo]
  )

  // 获取当前视图里被勾选（多选）的记录 ID 列表
  const getSelectedRecordIds = useCallback(
    async (tableId: string, viewId: string): Promise<string[]> => {
      const info = getTableInfo(tableId)
      if (!info || !viewId) return []
      try {
        const view = await info.table.getViewById(viewId)
        const ids = (await view.getSelectedRecordIdList()) || []
        return ids
      } catch {
        return []
      }
    },
    [getTableInfo]
  )

  const getCellString = useCallback(
    async (tableId: string, fieldId: string, recordId: string): Promise<string> => {
      const info = getTableInfo(tableId)
      if (!info || !fieldId || !recordId) return ''
      try {
        return (await info.table.getCellString(fieldId, recordId)) || ''
      } catch {
        return ''
      }
    },
    [getTableInfo]
  )

  const getAttachmentUrl = useCallback(
    async (tableId: string, token: string, fieldId: string, recordId: string): Promise<string> => {
      const info = getTableInfo(tableId)
      if (!info) return ''
      return info.table.getAttachmentUrl(token, fieldId, recordId)
    },
    [getTableInfo]
  )

  const checkDownloadPermission = useCallback(async () => {
    try {
      const { base, PermissionEntity, OperationType } = await import('@lark-base-open/js-sdk')
      return await base.getPermission({
        entity: PermissionEntity.Base,
        type: OperationType.Printable
      })
    } catch {
      return true
    }
  }, [])

  const showToast = useCallback(async (message: string, toastType: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    try {
      await bitable.ui.showToast({ toastType: toastType as any, message })
    } catch {
      // ignore
    }
  }, [])

  return {
    loading,
    error,
    tableInfoList,
    selection,
    setSelection,
    getTableInfo,
    fetchRecords,
    getSelectedRecordIds,
    getCellString,
    getAttachmentUrl,
    checkDownloadPermission,
    showToast
  }
}

export function isAttachmentField(field: IFieldMeta, allTables: ITableInfo[]) {
  if (field.type === FieldType.Attachment) return true
  if (field.type === FieldType.Lookup && field.property) {
    const { refFieldId, refTableId } = field.property
    const refTable = allTables.find((t) => t.id === refTableId)
    const refField = refTable?.fieldMetaList.find((f) => f.id === refFieldId)
    if (refField?.type === FieldType.Attachment) return true
  }
  return false
}
