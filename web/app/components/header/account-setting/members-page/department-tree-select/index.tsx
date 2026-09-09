'use client'

import type { DepartmentTreeNode } from '@/contract/console/departments'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/base/ui/popover'
import { cn } from '@/utils/classnames'
import TreeItem from './tree-item'
import { findNode, pruneTreeToIds } from './utils'

type DepartmentTreeSelectProps = {
  tree: DepartmentTreeNode[]
  manageableDepartmentIds: string[]
  value: string
  onChange: (id: string) => void
}

export default function DepartmentTreeSelect({
  tree,
  manageableDepartmentIds,
  value,
  onChange,
}: DepartmentTreeSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const visibleTree = useMemo(() => {
    if (manageableDepartmentIds.length === 0)
      return tree
    return pruneTreeToIds(tree, new Set(manageableDepartmentIds))
  }, [tree, manageableDepartmentIds])

  const selectedLabel = value
    ? (findNode(tree, value)?.name ?? t('members.allDepartments', { ns: 'common' }))
    : t('members.allDepartments', { ns: 'common' })

  const handleSelect = (id: string) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-testid="department-filter"
        aria-label={selectedLabel}
        className={cn(
          'group relative flex h-8 w-[200px] items-center rounded-lg border-0 bg-components-input-bg-normal px-2 py-1 text-left text-components-input-text-filled outline-none system-sm-regular',
          'hover:bg-state-base-hover-alt focus-visible:bg-state-base-hover-alt',
        )}
      >
        <span className="min-w-0 grow truncate">{selectedLabel}</span>
        <span className="i-ri-arrow-down-s-line h-4 w-4 shrink-0 text-text-quaternary group-hover:text-text-secondary" />
      </PopoverTrigger>
      <PopoverContent
        placement="bottom-start"
        sideOffset={4}
        popupClassName="max-h-[320px] min-w-[240px] overflow-auto p-1"
      >
        <div role="tree">
          <button
            type="button"
            data-testid="department-tree-item-all"
            className={cn(
              'flex w-full items-center rounded-lg px-2 py-1.5 text-left text-text-primary system-sm-medium hover:bg-state-base-hover',
              !value && 'bg-state-base-active',
            )}
            onClick={() => handleSelect('')}
          >
            {t('members.allDepartments', { ns: 'common' })}
          </button>
          {visibleTree.map(node => (
            <TreeItem
              key={node.id}
              node={node}
              depth={0}
              selectedId={value}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
