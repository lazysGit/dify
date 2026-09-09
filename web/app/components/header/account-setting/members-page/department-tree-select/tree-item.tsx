'use client'

import type { DepartmentTreeNode } from '@/contract/console/departments'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/classnames'

type TreeItemProps = {
  node: DepartmentTreeNode
  depth: number
  selectedId: string
  onSelect: (id: string) => void
}

export default function TreeItem({ node, depth, selectedId, onSelect }: TreeItemProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const selected = selectedId === node.id

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-selected={selected}
        aria-label={node.name}
        data-testid={`department-tree-item-${node.id}`}
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-lg py-1.5 pr-2 hover:bg-state-base-hover',
          selected && 'bg-state-base-active',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button
          type="button"
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-tertiary',
            hasChildren ? 'cursor-pointer hover:bg-state-base-hover-alt' : 'cursor-default opacity-0',
          )}
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren)
              setExpanded(prev => !prev)
          }}
          aria-label={expanded ? t('department.collapse', { ns: 'common' }) : t('department.expand', { ns: 'common' })}
        >
          <span className={cn('h-4 w-4', expanded ? 'i-ri-arrow-down-s-line' : 'i-ri-arrow-right-s-line')} />
        </button>
        <span className="i-ri-folder-line h-4 w-4 shrink-0 text-text-tertiary" />
        <span className="min-w-0 flex-1 truncate text-text-primary system-sm-medium">
          {node.name}
        </span>
      </div>
      {hasChildren && expanded && (
        <div role="group">
          {node.children.map(child => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </>
  )
}
