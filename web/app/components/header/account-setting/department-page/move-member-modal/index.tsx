'use client'

import type { DepartmentMember, DepartmentTreeNode } from '@/contract/console/departments'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import {
  AlertDialog,
  AlertDialogActions,
  AlertDialogCancelButton,
  AlertDialogConfirmButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/app/components/base/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/base/ui/select'
import { toast } from '@/app/components/base/ui/toast'
import { useMemberCreatedResources, useMoveMemberMutation } from '@/service/use-departments'

type MoveMemberModalProps = {
  member: DepartmentMember
  currentDepartmentId: string
  tree: DepartmentTreeNode[]
  manageableDepartmentIds: string[]
  isAdmin: boolean
  onClose: () => void
}

export default function MoveMemberModal({
  member,
  currentDepartmentId,
  tree,
  manageableDepartmentIds,
  isAdmin,
  onClose,
}: MoveMemberModalProps) {
  const { t } = useTranslation()
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('')
  const [showConfirm, setShowConfirm] = useState(false)
  const moveMemberMutation = useMoveMemberMutation()
  const { data: createdResources, isLoading: isLoadingResources } = useMemberCreatedResources(member.id)

  const availableDepartments = isAdmin
    ? flattenExcluding(tree, currentDepartmentId)
    : flattenFilteredByManageable(tree, manageableDepartmentIds, currentDepartmentId)

  const departmentItems = useMemo(
    () => Object.fromEntries(availableDepartments.map(d => [d.id, d.name])),
    [availableDepartments],
  )

  const handleConfirm = async () => {
    if (!selectedDepartmentId)
      return

    try {
      await moveMemberMutation.mutateAsync({
        params: { id: currentDepartmentId },
        body: {
          member_id: member.id,
          department_id: selectedDepartmentId,
        },
      })
      toast.success(t('department.moveMemberSuccess', { ns: 'common' }))
      onClose()
    }
    catch {
      toast.error(t('department.moveFailed', { ns: 'common' }))
    }
  }

  return (
    <div className="fixed inset-0 z-[1002] flex items-center justify-center bg-background-overlay" onClick={onClose}>
      <div
        className="w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl border-[0.5px] border-components-panel-border bg-components-panel-bg shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-text-primary title-2xl-semi-bold">
            {t('department.moveMember', { ns: 'common' })}
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-text-secondary system-sm-medium">
                {t('department.targetDepartment', { ns: 'common' })}
              </label>
              <Select
                value={selectedDepartmentId || null}
                onValueChange={v => setSelectedDepartmentId(v ?? '')}
                items={departmentItems}
              >
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder={t('department.selectTarget', { ns: 'common' })} />
                </SelectTrigger>
                <SelectContent>
                  {availableDepartments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-text-secondary system-sm-medium">
                {t('department.createdResources', { ns: 'common' })}
              </label>
              {isLoadingResources
                ? (
                    <div className="flex items-center justify-center py-4">
                      <span className="i-ri-loader-4-line h-5 w-5 animate-spin text-text-tertiary" />
                    </div>
                  )
                : (
                    <div className="flex flex-col gap-3 rounded-lg border border-divider-subtle p-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-text-tertiary system-xs-medium">
                          {t('department.createdApps', { ns: 'common' })}
                        </span>
                        {createdResources?.apps && createdResources.apps.length > 0
                          ? (
                              createdResources.apps.map(app => (
                                <div key={app.id} className="flex items-center justify-between rounded px-2 py-1 text-text-secondary system-sm-regular">
                                  <span className="truncate">{app.name}</span>
                                </div>
                              ))
                            )
                          : (
                              <span className="text-text-quaternary system-sm-regular">
                                {t('department.none', { ns: 'common' })}
                              </span>
                            )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-text-tertiary system-xs-medium">
                          {t('department.createdDatasets', { ns: 'common' })}
                        </span>
                        {createdResources?.datasets && createdResources.datasets.length > 0
                          ? (
                              createdResources.datasets.map(ds => (
                                <div key={ds.id} className="flex items-center justify-between rounded px-2 py-1 text-text-secondary system-sm-regular">
                                  <span className="truncate">{ds.name}</span>
                                </div>
                              ))
                            )
                          : (
                              <span className="text-text-quaternary system-sm-regular">
                                {t('department.none', { ns: 'common' })}
                              </span>
                            )}
                      </div>
                    </div>
                  )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-divider-subtle p-4">
          <Button variant="secondary" onClick={onClose}>
            {t('operation.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            disabled={!selectedDepartmentId}
            onClick={() => setShowConfirm(true)}
          >
            {t('operation.confirm', { ns: 'common' })}
          </Button>
        </div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <div className="p-6">
              <AlertDialogTitle className="text-text-primary title-2xl-semi-bold">
                {t('department.moveMember', { ns: 'common' })}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 whitespace-pre-wrap break-words text-text-tertiary system-sm-regular">
                {t('department.moveMemberConfirm', { ns: 'common' })}
              </AlertDialogDescription>
            </div>
            <AlertDialogActions>
              <AlertDialogCancelButton disabled={moveMemberMutation.isPending}>
                {t('operation.cancel', { ns: 'common' })}
              </AlertDialogCancelButton>
              <AlertDialogConfirmButton
                loading={moveMemberMutation.isPending}
                disabled={moveMemberMutation.isPending}
                onClick={handleConfirm}
              >
                {t('operation.confirm', { ns: 'common' })}
              </AlertDialogConfirmButton>
            </AlertDialogActions>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function flattenExcluding(nodes: DepartmentTreeNode[], excludeId: string): DepartmentTreeNode[] {
  return nodes.reduce<DepartmentTreeNode[]>((acc, node) => {
    if (node.id === excludeId) {
      acc.push(...flattenExcluding(node.children, excludeId))
      return acc
    }
    acc.push(node)
    acc.push(...flattenExcluding(node.children, excludeId))
    return acc
  }, [])
}

function flattenFilteredByManageable(nodes: DepartmentTreeNode[], manageableIds: string[], excludeId: string): DepartmentTreeNode[] {
  return nodes.reduce<DepartmentTreeNode[]>((acc, node) => {
    if (node.id === excludeId) {
      acc.push(...flattenFilteredByManageable(node.children, manageableIds, excludeId))
      return acc
    }
    if (manageableIds.includes(node.id))
      acc.push(node)
    acc.push(...flattenFilteredByManageable(node.children, manageableIds, excludeId))
    return acc
  }, [])
}
