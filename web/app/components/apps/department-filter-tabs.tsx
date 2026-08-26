'use client'

import { useTranslation } from 'react-i18next'
import { useDepartmentList } from '@/service/use-departments'
import { cn } from '@/utils/classnames'

type ResourceType = 'app' | 'dataset'

type DepartmentFilterTabsProps = {
  resourceType?: ResourceType
  selectedDepartmentId?: string
  onDepartmentChange: (departmentId: string | undefined) => void
  className?: string
}

const DepartmentFilterTabs = ({
  resourceType = 'app',
  selectedDepartmentId,
  onDepartmentChange,
  className,
}: DepartmentFilterTabsProps) => {
  const { t } = useTranslation()
  const { data: deptListData } = useDepartmentList()

  const departments = deptListData?.departments ?? []
  const getCount = (dept: typeof departments[0]) => resourceType === 'app' ? dept.app_count : dept.dataset_count
  const totalCount = departments.reduce((sum, d) => sum + getCount(d), 0)

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      <button
        type="button"
        className={cn(
          'rounded-lg px-3 py-1.5 text-sm transition-colors',
          !selectedDepartmentId
            ? 'bg-state-base-active font-medium text-text-primary'
            : 'text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary',
        )}
        onClick={() => onDepartmentChange(undefined)}
      >
        {t('department.filter.all', { ns: 'app' })}
        <span className="ml-1 text-text-quaternary">
          (
          {totalCount}
          )
        </span>
      </button>
      {departments.map(dept => (
        <button
          key={dept.id}
          type="button"
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm transition-colors',
            selectedDepartmentId === dept.id
              ? 'bg-state-base-active font-medium text-text-primary'
              : 'text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary',
          )}
          onClick={() => onDepartmentChange(dept.id)}
        >
          {dept.name}
          <span className="ml-1 text-text-quaternary">
            (
            {getCount(dept)}
            )
          </span>
        </button>
      ))}
    </div>
  )
}

export default DepartmentFilterTabs
