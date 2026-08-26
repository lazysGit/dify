'use client'

import type { DepartmentTreeNode } from '@/contract/console/departments'
import { useState } from 'react'
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
import { useMoveDepartmentMutation } from '@/service/use-departments'

type MoveDepartmentModalProps = {
  departmentId: string
  tree: DepartmentTreeNode[]
  onClose: () => void
}

export default function MoveDepartmentModal({
  departmentId,
  tree,
  onClose,
}: MoveDepartmentModalProps) {
  const { t } = useTranslation()
  const [newParentId, setNewParentId] = useState<string>('')
  const [showConfirm, setShowConfirm] = useState(false)
  const moveMutation = useMoveDepartmentMutation()

  const availableParents = flattenAvailableParents(tree, departmentId)

  const handleConfirm = async () => {
    try {
      await moveMutation.mutateAsync({
        params: { id: departmentId },
        body: {
          parent_id: newParentId || null,
        },
      })
      toast.success(t('department.moveDepartmentConfirm', { ns: 'common' }))
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
            {t('department.moveDepartment', { ns: 'common' })}
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-text-secondary system-sm-medium">
                {t('department.newParent', { ns: 'common' })}
              </label>
              <Select value={newParentId} onValueChange={v => setNewParentId(v ?? '')}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder={t('department.selectParent', { ns: 'common' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    {t('department.noParent', { ns: 'common' })}
                  </SelectItem>
                  {availableParents.map(node => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-divider-subtle p-4">
          <Button variant="secondary" onClick={onClose}>
            {t('operation.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowConfirm(true)}
          >
            {t('operation.confirm', { ns: 'common' })}
          </Button>
        </div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <div className="p-6">
              <AlertDialogTitle className="text-text-primary title-2xl-semi-bold">
                {t('department.moveDepartment', { ns: 'common' })}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 whitespace-pre-wrap break-words text-text-tertiary system-sm-regular">
                {t('department.moveDepartmentConfirm', { ns: 'common' })}
              </AlertDialogDescription>
            </div>
            <AlertDialogActions>
              <AlertDialogCancelButton disabled={moveMutation.isPending}>
                {t('operation.cancel', { ns: 'common' })}
              </AlertDialogCancelButton>
              <AlertDialogConfirmButton
                loading={moveMutation.isPending}
                disabled={moveMutation.isPending}
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

function flattenAvailableParents(nodes: DepartmentTreeNode[], excludeId: string): DepartmentTreeNode[] {
  return nodes.reduce<DepartmentTreeNode[]>((acc, node) => {
    if (node.is_default)
      return acc
    if (node.id === excludeId)
      return acc
    if (isDescendant(node, excludeId))
      return acc
    acc.push(node)
    acc.push(...flattenAvailableParents(node.children, excludeId))
    return acc
  }, [])
}

function isDescendant(node: DepartmentTreeNode, targetId: string): boolean {
  for (const child of node.children) {
    if (child.id === targetId)
      return true
    if (isDescendant(child, targetId))
      return true
  }
  return false
}
