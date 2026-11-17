'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogActions,
  AlertDialogCancelButton,
  AlertDialogConfirmButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/app/components/base/ui/alert-dialog'
import { toast } from '@/app/components/base/ui/toast'
import TreeItem from '@/app/components/header/account-setting/members-page/department-tree-select/tree-item'
import { pruneTreeToIds } from '@/app/components/header/account-setting/members-page/department-tree-select/utils'
import { useDepartmentList, useTransferAppMutation, useTransferDatasetMutation } from '@/service/use-departments'

type ResourceType = 'app' | 'dataset'

type TransferDepartmentModalProps = {
  show: boolean
  resourceId: string
  resourceType: ResourceType
  currentDepartmentId?: string | null
  onClose: () => void
  onSuccess: () => void
}

const TransferDepartmentModal = ({
  show,
  resourceId,
  resourceType,
  currentDepartmentId,
  onClose,
  onSuccess,
}: TransferDepartmentModalProps) => {
  const { t } = useTranslation()
  const { data: deptListData } = useDepartmentList()
  const { mutateAsync: transferApp, isPending: isTransferringApp } = useTransferAppMutation()
  const { mutateAsync: transferDataset, isPending: isTransferringDataset } = useTransferDatasetMutation()

  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')

  const departments = deptListData?.departments ?? []
  const departmentTree = deptListData?.tree ?? []
  const availableDepartmentIds = useMemo(
    () => departments.filter(d => d.id !== currentDepartmentId).map(d => d.id),
    [departments, currentDepartmentId],
  )
  const visibleTree = useMemo(() => {
    if (availableDepartmentIds.length === 0)
      return []
    return pruneTreeToIds(departmentTree, new Set(availableDepartmentIds))
  }, [departmentTree, availableDepartmentIds])
  const isPending = isTransferringApp || isTransferringDataset

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelectedDepartmentId('')
      onClose()
    }
  }, [onClose])

  const handleConfirm = useCallback(async () => {
    if (!selectedDepartmentId)
      return

    try {
      if (resourceType === 'app')
        await transferApp({ params: { id: resourceId }, body: { department_id: selectedDepartmentId } })
      else
        await transferDataset({ params: { id: resourceId }, body: { department_id: selectedDepartmentId } })

      toast.success(t('transferDepartment.success', { ns: 'app' }))
      setSelectedDepartmentId('')
      onSuccess()
    }
    catch {
      toast.error(t('transferDepartment.failed', { ns: 'app' }))
    }
  }, [selectedDepartmentId, resourceType, resourceId, transferApp, transferDataset, t, onSuccess])

  return (
    <AlertDialog open={show} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <div className="flex flex-col gap-4 px-6 pb-4 pt-6">
          <AlertDialogTitle className="text-text-primary title-2xl-semi-bold">
            {t('transferDepartment.title', { ns: 'app' })}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-text-tertiary system-md-regular">
            {t('transferDepartment.description', { ns: 'app' })}
          </AlertDialogDescription>
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary system-sm-medium">
              {t('transferDepartment.targetDepartment', { ns: 'app' })}
            </label>
            {visibleTree.length === 0
              ? (
                  <div className="py-4 text-center text-text-quaternary system-sm-regular">
                    {t('transferDepartment.noAvailableDepartments', { ns: 'app' })}
                  </div>
                )
              : (
                  <div
                    data-testid="transfer-department-tree"
                    className="max-h-[240px] overflow-y-auto rounded-lg bg-components-input-bg-normal p-1"
                  >
                    <div role="tree">
                      {visibleTree.map(node => (
                        <TreeItem
                          key={node.id}
                          node={node}
                          depth={0}
                          selectedId={selectedDepartmentId}
                          onSelect={setSelectedDepartmentId}
                        />
                      ))}
                    </div>
                  </div>
                )}
          </div>
        </div>
        <AlertDialogActions>
          <AlertDialogCancelButton disabled={isPending}>
            {t('operation.cancel', { ns: 'common' })}
          </AlertDialogCancelButton>
          <AlertDialogConfirmButton
            loading={isPending}
            disabled={isPending || !selectedDepartmentId || visibleTree.length === 0}
            onClick={handleConfirm}
          >
            {t('operation.confirm', { ns: 'common' })}
          </AlertDialogConfirmButton>
        </AlertDialogActions>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default TransferDepartmentModal
