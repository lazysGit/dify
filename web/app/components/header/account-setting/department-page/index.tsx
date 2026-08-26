'use client'

import type { DepartmentTreeNode } from '@/contract/console/departments'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import SearchInput from '@/app/components/base/search-input'
import { useDepartmentList } from '@/service/use-departments'
import CreateDepartmentModal from './create-department-modal'
import DepartmentTree from './department-tree'

type DepartmentPageProps = {
  isAdmin: boolean
  isDepartmentAdmin: boolean
  apiFailed: boolean
}

export default function DepartmentPage({ isAdmin, isDepartmentAdmin: _isDepartmentAdmin, apiFailed }: DepartmentPageProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useDepartmentList()
  const [searchValue, setSearchValue] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const tree = data?.tree ?? []
  const canCreate = isAdmin

  const filteredTree = useMemo(() => {
    if (!searchValue.trim())
      return tree
    return filterTree(tree, searchValue.trim().toLowerCase())
  }, [tree, searchValue])

  if (apiFailed && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
        <span className="i-ri-error-warning-line mb-2 h-8 w-8" />
        <p className="system-sm-regular">{t('department.loadFailed', { ns: 'common' })}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="i-ri-loader-4-line h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
        {canCreate
          ? (
              <>
                <span className="i-ri-org-chart-line mb-2 h-8 w-8" />
                <p className="mb-4 system-sm-regular">{t('department.emptyAdmin', { ns: 'common' })}</p>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <span className="i-ri-add-line mr-1 h-4 w-4" />
                  {t('department.createFirst', { ns: 'common' })}
                </Button>
              </>
            )
          : (
              <>
                <span className="i-ri-org-chart-line mb-2 h-8 w-8" />
                <p className="system-sm-regular">{t('department.emptyDeptAdmin', { ns: 'common' })}</p>
              </>
            )}
        {showCreateModal && (
          <CreateDepartmentModal
            tree={tree}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SearchInput
          className="w-[200px]"
          value={searchValue}
          onChange={setSearchValue}
        />
        {canCreate && (
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <span className="i-ri-add-line mr-1 h-4 w-4" />
            {t('department.create', { ns: 'common' })}
          </Button>
        )}
      </div>
      <DepartmentTree
        tree={filteredTree}
        isAdmin={isAdmin}
      />
      {showCreateModal && (
        <CreateDepartmentModal
          tree={tree}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}

function filterTree(nodes: DepartmentTreeNode[], query: string): DepartmentTreeNode[] {
  return nodes.reduce<DepartmentTreeNode[]>((acc, node) => {
    const nameMatch = node.name.toLowerCase().includes(query)
    const filteredChildren = filterTree(node.children, query)
    if (nameMatch || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: nameMatch ? node.children : filteredChildren,
      })
    }
    return acc
  }, [])
}
