'use client'

import { useCallback, useState } from 'react'
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

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>(undefined)

  const departments = deptListData?.departments ?? []
  const availableDepartments = departments.filter(d => d.id !== currentDepartmentId)
  const isPending = isTransferringApp || isTransferringDataset

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelectedDepartmentId(undefined)
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
      setSelectedDepartmentId(undefined)
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
            <div className="flex max-h-[200px] flex-col gap-1 overflow-y-auto">
              {availableDepartments.map(dept => (
                <label
                  key={dept.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-state-base-hover"
                >
                  <input
                    type="radio"
                    name="target-department"
                    value={dept.id}
                    checked={selectedDepartmentId === dept.id}
                    onChange={() => setSelectedDepartmentId(dept.id)}
                    className="h-4 w-4 text-text-accent"
                  />
                  <span className="text-text-secondary system-sm-regular">{dept.name}</span>
                </label>
              ))}
              {availableDepartments.length === 0 && (
                <div className="py-4 text-center text-text-quaternary system-sm-regular">
                  {t('transferDepartment.noAvailableDepartments', { ns: 'app' })}
                </div>
              )}
            </div>
          </div>
        </div>
        <AlertDialogActions>
          <AlertDialogCancelButton disabled={isPending}>
            {t('operation.cancel', { ns: 'common' })}
          </AlertDialogCancelButton>
          <AlertDialogConfirmButton
            loading={isPending}
            disabled={isPending || !selectedDepartmentId || availableDepartments.length === 0}
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
