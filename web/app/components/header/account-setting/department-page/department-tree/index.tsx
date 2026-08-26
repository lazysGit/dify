'use client'

import type { DepartmentTreeNode } from '@/contract/console/departments'
import TreeItem from './tree-item'

type DepartmentTreeProps = {
  tree: DepartmentTreeNode[]
  isAdmin: boolean
  onManage?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function DepartmentTree({ tree, isAdmin, onManage, onDelete }: DepartmentTreeProps) {
  if (tree.length === 0)
    return null

  return (
    <div className="flex flex-col" role="tree">
      {tree.map(node => (
        <TreeItem
          key={node.id}
          node={node}
          depth={0}
          isAdmin={isAdmin}
          onManage={onManage}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
