'use client'

import type { DepartmentTreeNode } from '@/contract/console/departments'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/app/components/base/ui/dialog'
import { toast } from '@/app/components/base/ui/toast'
import { cn } from '@/utils/classnames'

type PublishDepartmentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tree: DepartmentTreeNode[]
  selectedIds: string[]
  onSave: (ids: string[]) => Promise<void>
  isSaving: boolean
}

type CheckboxTreeItemProps = {
  node: DepartmentTreeNode
  depth: number
  selectedIds: Set<string>
  onToggle: (id: string) => void
}

function CheckboxTreeItem({ node, depth, selectedIds, onToggle }: CheckboxTreeItemProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isChecked = selectedIds.has(node.id)

  const handleToggle = () => {
    if (hasChildren)
      setExpanded(prev => !prev)
  }

  const handleCheck = () => {
    onToggle(node.id)
  }

  return (
    <>
      <div
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-state-base-hover"
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

        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheck}
            className="border-components-input-border h-4 w-4 rounded border bg-components-input-bg-normal text-text-accent"
          />
          <span className="truncate text-text-primary system-sm-medium">
            {node.name}
          </span>
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
  tree,
  selectedIds,
  onSave,
  isSaving,
}: PublishDepartmentModalProps) {
  const { t } = useTranslation()
  const [currentSelected, setCurrentSelected] = useState<Set<string>>(new Set(selectedIds))

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
                  onToggle={handleToggle}
                />
              ))}
        </div>

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
