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
import { toast } from '@/app/components/base/ui/toast'
import { useDeleteDepartmentMutation } from '@/service/use-departments'
import { cn } from '@/utils/classnames'

type TreeItemProps = {
  node: DepartmentTreeNode
  depth: number
  isAdmin: boolean
  onManage?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function TreeItem({ node, depth, isAdmin, onManage, onDelete }: TreeItemProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const deleteMutation = useDeleteDepartmentMutation()
  const hasChildren = node.children.length > 0
  const isDefault = node.is_default

  const handleToggle = () => {
    if (hasChildren)
      setExpanded(prev => !prev)
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ params: { id: node.id } })
      toast.success(t('department.deleteSuccess', { ns: 'common' }))
      setShowDeleteDialog(false)
      onDelete?.(node.id)
    }
    catch {
      toast.error(t('department.deleteFailed', { ns: 'common' }))
    }
  }

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-state-base-hover"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          type="button"
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-tertiary',
            hasChildren ? 'cursor-pointer hover:bg-state-base-hover-alt' : 'cursor-default opacity-0',
          )}
          onClick={handleToggle}
          aria-label={expanded ? t('department.collapse', { ns: 'common' }) : t('department.expand', { ns: 'common' })}
        >
          <span className={cn('h-4 w-4 transition-transform', expanded ? 'i-ri-arrow-down-s-line' : 'i-ri-arrow-right-s-line')} />
        </button>

        <span className={cn('i-ri-folder-line h-4 w-4 shrink-0 text-text-tertiary', isDefault && 'text-text-accent')} />

        <span className="min-w-0 flex-1 truncate text-text-primary system-sm-medium">
          {node.name}
        </span>
        {isDefault && (
          <span className="inline-flex shrink-0 items-center rounded bg-state-accent-solid px-1 py-0.5 text-text-primary-on-surface system-2xs-medium">
            {t('department.default', { ns: 'common' })}
          </span>
        )}

        <span className="flex shrink-0 items-center gap-2 text-text-quaternary system-xs-regular">
          <span title={t('department.memberCount', { ns: 'common' })}>
            <span className="i-ri-group-line mr-0.5 h-3.5 w-3.5 align-text-bottom" />
            {node.member_count}
          </span>
          <span title={t('department.appCount', { ns: 'common' })}>
            <span className="i-ri-robot-line mr-0.5 h-3.5 w-3.5 align-text-bottom" />
            {node.app_count}
          </span>
          <span title={t('department.datasetCount', { ns: 'common' })}>
            <span className="i-ri-database-2-line mr-0.5 h-3.5 w-3.5 align-text-bottom" />
            {node.dataset_count}
          </span>
        </span>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="small"
            variant="ghost"
            onClick={() => onManage?.(node.id)}
          >
            {t('department.manage', { ns: 'common' })}
          </Button>
          {isAdmin && (
            <Button
              size="small"
              variant="ghost"
              destructive
              disabled={isDefault}
              onClick={() => setShowDeleteDialog(true)}
            >
              {t('department.delete', { ns: 'common' })}
            </Button>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div role="group">
          {node.children.map(child => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              isAdmin={isAdmin}
              onManage={onManage}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <div className="p-6">
            <AlertDialogTitle className="text-text-primary title-2xl-semi-bold">
              {t('department.deleteConfirmTitle', { ns: 'common' })}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 whitespace-pre-wrap break-words text-text-tertiary system-sm-regular">
              {t('department.deleteConfirmMessage', { ns: 'common' })}
            </AlertDialogDescription>
          </div>
          <AlertDialogActions>
            <AlertDialogCancelButton disabled={deleteMutation.isPending}>
              {t('operation.cancel', { ns: 'common' })}
            </AlertDialogCancelButton>
            <AlertDialogConfirmButton
              loading={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {t('operation.confirm', { ns: 'common' })}
            </AlertDialogConfirmButton>
          </AlertDialogActions>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
