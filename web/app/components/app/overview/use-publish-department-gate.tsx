'use client'

import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore as useAppStore } from '@/app/components/app/store'
import { toast } from '@/app/components/base/ui/toast'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { updateAppSiteStatus } from '@/service/apps'
import { useDepartmentList, usePublishDepartments, useUpdatePublishDepartmentsMutation } from '@/service/use-departments'
import PublishDepartmentModal from './publish-department-modal'

export const usePublishDepartmentGate = (appId: string | undefined) => {
  const { t } = useTranslation()
  const departmentAccess = useGlobalPublicStore(s => s.systemFeatures.department_access_control)
  const appDetail = useAppStore(s => s.appDetail)
  const setAppDetail = useAppStore(s => s.setAppDetail)
  const enabled = Boolean(departmentAccess && appId)
  const { data: publishData, isLoading: publishLoading } = usePublishDepartments(appId ?? '')
  const { data: deptData, isLoading: deptLoading } = useDepartmentList()
  const updateMutation = useUpdatePublishDepartmentsMutation(appId ?? '')

  const isScopeLoading = enabled && (publishLoading || deptLoading)
  const publishedDepts = publishData?.departments ?? []
  const needsScope = enabled && !isScopeLoading && publishedDepts.length === 0

  const [modalOpen, setModalOpen] = useState(false)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)

  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok)
    resolverRef.current = null
    setModalOpen(false)
  }, [])

  const ensureScope = useCallback(() => {
    if (!needsScope)
      return Promise.resolve(true)

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setModalOpen(true)
    })
  }, [needsScope])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && resolverRef.current) {
      settle(false)
      return
    }
    setModalOpen(open)
  }, [settle])

  const handleSave = useCallback(async (ids: string[]) => {
    if (!appId) {
      settle(true)
      return
    }

    if (ids.length > 0) {
      if (!appDetail?.enable_site) {
        const res = await updateAppSiteStatus({
          url: `/apps/${appId}/site-enable`,
          body: { enable_site: true },
        })
        if (appDetail)
          setAppDetail({ ...appDetail, ...res, enable_site: true })
      }

      await updateMutation.mutateAsync({
        params: { id: appId },
        body: { department_ids: ids },
      })
      toast.success(t('department.publishSaveSuccess', { ns: 'common' }))
    }

    settle(true)
  }, [appDetail, appId, setAppDetail, settle, t, updateMutation])

  const publishWithScope = useCallback(async (fn: () => Promise<void>): Promise<boolean> => {
    if (isScopeLoading)
      return false
    if (needsScope) {
      const ok = await ensureScope()
      if (!ok)
        return false
    }
    await fn()
    return true
  }, [ensureScope, isScopeLoading, needsScope])

  const modal: ReactNode = modalOpen && appId
    ? (
        <PublishDepartmentModal
          open={modalOpen}
          onOpenChange={handleOpenChange}
          appId={appId}
          tree={deptData?.tree ?? []}
          selectedIds={[]}
          onSave={handleSave}
          isSaving={updateMutation.isPending}
        />
      )
    : null

  return {
    needsScope,
    isScopeLoading,
    ensureScope,
    publishWithScope,
    modal,
  }
}
