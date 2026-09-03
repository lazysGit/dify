'use client'

import type { FC } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import Loading from '@/app/components/base/loading'
import { toast } from '@/app/components/base/ui/toast'
import { useAppContext } from '@/context/app-context'
import { useDepartmentList, usePublishDepartments, useUpdatePublishDepartmentsMutation } from '@/service/use-departments'
import PublishDepartmentModal from '../publish-department-modal'

type PublishDepartmentPanelProps = {
  appId: string
}

const PublishDepartmentPanel: FC<PublishDepartmentPanelProps> = ({ appId }) => {
  const { t } = useTranslation()
  const { isCurrentWorkspaceManager } = useAppContext()
  const { data: deptData, isLoading: deptLoading } = useDepartmentList()
  const { data: publishData, isLoading: publishLoading } = usePublishDepartments(appId)
  const updateMutation = useUpdatePublishDepartmentsMutation(appId)
  const [modalOpen, setModalOpen] = useState(false)

  const canEdit = isCurrentWorkspaceManager

  if (deptLoading || publishLoading)
    return <Loading />

  const publishedDepts = publishData?.departments || []
  const tree = deptData?.tree || []

  const handleSave = async (ids: string[]) => {
    await updateMutation.mutateAsync({
      params: { id: appId },
      body: { department_ids: ids },
    })
    toast.success(t('department.publishSaveSuccess', { ns: 'common' }))
  }

  return (
    <>
      <div className="rounded-xl border border-effects-highlight bg-background-default p-3">
        <div className="mb-2 text-text-primary system-sm-semibold">
          {t('department.publishPanelTitle', { ns: 'common' })}
        </div>
        <div className="mb-2 text-text-tertiary system-xs-regular">
          {publishedDepts.length === 0
            ? t('department.publishPanelEmpty', { ns: 'common' })
            : publishedDepts.map(d => d.name).join(', ')}
        </div>
        {canEdit && (
          <Button size="small" variant="ghost" onClick={() => setModalOpen(true)}>
            {t('department.publishEditButton', { ns: 'common' })}
          </Button>
        )}
      </div>

      {modalOpen && (
        <PublishDepartmentModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          appId={appId}
          tree={tree}
          selectedIds={publishedDepts.map(d => d.id)}
          onSave={handleSave}
          isSaving={updateMutation.isPending}
        />
      )}
    </>
  )
}

export default PublishDepartmentPanel
