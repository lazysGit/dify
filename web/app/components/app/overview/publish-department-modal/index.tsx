'use client'

import type { DepartmentTreeNode } from '@/contract/console/departments'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/app/components/base/ui/dialog'
import { toast } from '@/app/components/base/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/base/ui/tooltip'
import { usePublishableDepartments } from '@/service/use-departments'
import { cn } from '@/utils/classnames'

type PublishDepartmentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  appId: string
  tree: DepartmentTreeNode[]
  selectedIds: string[]
  onSave: (ids: string[]) => Promise<void>
  isSaving: boolean
}

type CheckboxTreeItemProps = {
  node: DepartmentTreeNode
  depth: number
  selectedIds: Set<string>
  disabledIds: Set<string>
  onToggle: (id: string) => void
}

function CheckboxTreeItem({ node, depth, selectedIds, disabledIds, onToggle }: CheckboxTreeItemProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isChecked = selectedIds.has(node.id)
  const isDisabled = disabledIds.has(node.id)

  const handleToggle = () => {
    if (hasChildren)
      setExpanded(prev => !prev)
  }

  const handleCheck = () => {
    if (isDisabled)
      return
    onToggle(node.id)
  }

  return (
    <>
      <div
        className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-state-base-hover', isDisabled && 'opacity-60 hover:bg-transparent')}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren
          ? (
              <button
                type="button"
                className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-text-tertiary hover:bg-state-base-hover-alt"
                onClick={handleToggle}
              >
                <span className={cn('h-4 w-4 transition-transform', expanded ? 'i-ri-arrow-down-s-line' : 'i-ri-arrow-right-s-line')} />
              </button>
            )
          : <span className="h-5 w-5 shrink-0" />}

        <label className={cn('flex min-w-0 flex-1 items-center gap-2', !isDisabled && 'cursor-pointer')}>
          <input
            type="checkbox"
            checked={isChecked}
            disabled={isDisabled}
            aria-label={node.name}
            onChange={handleCheck}
            className="border-components-input-border h-4 w-4 rounded border bg-components-input-bg-normal text-text-accent"
          />
          <span className="truncate text-text-primary system-sm-medium">
            {node.name}
          </span>
          {isDisabled && (
            <Tooltip>
              <TooltipTrigger
                render={<span aria-label={t('publish.cross_department_locked', { ns: 'common' })} className="i-ri-lock-line h-3.5 w-3.5 shrink-0 text-text-tertiary" />}
              />
              <TooltipContent>
                {t('publish.cross_department_locked', { ns: 'common' })}
              </TooltipContent>
            </Tooltip>
          )}
        </label>
      </div>

      {hasChildren && expanded && (
        <div role="group">
          {node.children.map(child => (
            <CheckboxTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedIds={selectedIds}
              disabledIds={disabledIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default function PublishDepartmentModal({
  open,
  onOpenChange,
  appId,
  tree,
  selectedIds,
  onSave,
  isSaving,
}: PublishDepartmentModalProps) {
  const { t } = useTranslation()
  const [currentSelected, setCurrentSelected] = useState<Set<string>>(new Set(selectedIds))
  const { data: publishableData } = usePublishableDepartments(appId)

  // 数据未加载时不限制（保存时后端权限检查兜底）；加载后仅允许 publishable-departments 返回的部门
  const disabledIds = useMemo(() => {
    if (!publishableData)
      return new Set<string>()
    const allowed = new Set(publishableData.departments.map(d => d.id))
    const collect = (nodes: DepartmentTreeNode[], acc: Set<string>): Set<string> => {
      for (const node of nodes) {
        if (!allowed.has(node.id))
          acc.add(node.id)
        collect(node.children, acc)
      }
      return acc
    }
    return collect(tree, new Set<string>())
  }, [publishableData, tree])

  const handleToggle = (id: string) => {
    setCurrentSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id))
        next.delete(id)
      else
        next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    try {
      await onSave(Array.from(currentSelected))
      onOpenChange(false)
    }
    catch {
      toast.error(t('department.publishSaveFailed', { ns: 'common' }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="mb-4">
          <DialogTitle className="text-text-primary title-2xl-semi-bold">{t('department.publishModalTitle', { ns: 'common' })}</DialogTitle>
          <DialogDescription className="mt-1 text-text-tertiary system-sm-regular">
            {t('department.publishModalDesc', { ns: 'common' })}
          </DialogDescription>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-divider-regular p-2">
          {tree.length === 0
            ? (
                <div className="py-8 text-center text-text-tertiary system-sm-regular">
                  {t('department.emptyDeptAdmin', { ns: 'common' })}
                </div>
              )
            : tree.map(node => (
                <CheckboxTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedIds={currentSelected}
                  disabledIds={disabledIds}
                  onToggle={handleToggle}
                />
              ))}
        </div>

        {publishableData && !publishableData.can_publish_cross_department && (
          <div className="mt-3 text-text-tertiary system-xs-regular">
            {t('publish.own_department_only_hint', { ns: 'common' })}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)}>{t('operation.cancel', { ns: 'common' })}</Button>
          <Button variant="primary" onClick={handleSave} loading={isSaving}>
            {t('operation.save', { ns: 'common' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
