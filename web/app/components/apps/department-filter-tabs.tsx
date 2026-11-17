'use client'

import { useTranslation } from 'react-i18next'
import DepartmentTreeSelect from '@/app/components/header/account-setting/members-page/department-tree-select'
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
  const tree = deptListData?.tree ?? []
  const manageableDepartmentIds = deptListData?.manageable_department_ids ?? []
  const getCount = (dept: typeof departments[0]) => resourceType === 'app' ? dept.app_count : dept.dataset_count
  const scopedDepartments = manageableDepartmentIds.length > 0
    ? departments.filter(dept => manageableDepartmentIds.includes(dept.id))
    : departments
  const totalCount = scopedDepartments.reduce((sum, d) => sum + getCount(d), 0)

  return (
    <DepartmentTreeSelect
      tree={tree}
      manageableDepartmentIds={manageableDepartmentIds}
      value={selectedDepartmentId ?? ''}
      onChange={id => onDepartmentChange(id || undefined)}
      emptyLabel={`${t('department.filter.allDepartments', { ns: 'app' })} (${totalCount})`}
      triggerTestId="department-filter-select"
      triggerClassName={cn('h-8 w-[200px]', className)}
      getCount={getCount}
    />
  )
}

export default DepartmentFilterTabs
