'use client'

import type { DepartmentTreeNode } from '@/contract/console/departments'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'

type SubDepartmentListProps = {
  departments: DepartmentTreeNode[]
  onManage: (id: string) => void
}

export default function SubDepartmentList({ departments, onManage }: SubDepartmentListProps) {
  const { t } = useTranslation()

  if (departments.length === 0)
    return null

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-text-primary system-sm-medium">
        {t('department.subDepartments', { ns: 'common' })}
      </h3>
      <div className="flex flex-col gap-1">
        {departments.map(dept => (
          <div
            key={dept.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-state-base-hover"
          >
            <span className="i-ri-folder-line h-4 w-4 shrink-0 text-text-tertiary" />
            <span className="min-w-0 flex-1 truncate text-text-primary system-sm-regular">
              {dept.name}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-text-quaternary system-xs-regular">
              <span title={t('department.memberCount', { ns: 'common' })}>
                <span className="i-ri-group-line mr-0.5 h-3.5 w-3.5 align-text-bottom" />
                {dept.member_count}
              </span>
              <span title={t('department.appCount', { ns: 'common' })}>
                <span className="i-ri-robot-line mr-0.5 h-3.5 w-3.5 align-text-bottom" />
                {dept.app_count}
              </span>
            </span>
            <Button
              size="small"
              variant="ghost"
              onClick={() => onManage(dept.id)}
            >
              {t('department.manage', { ns: 'common' })}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
