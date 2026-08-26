'use client'

import type { DepartmentMember } from '@/contract/console/departments'
import { useTranslation } from 'react-i18next'
import Badge from '@/app/components/base/badge'
import Button from '@/app/components/base/button'

type MemberRowProps = {
  member: DepartmentMember
  isAdmin: boolean
  isDepartmentAdmin: boolean
  isSelf: boolean
  canManageAdmin: boolean
  onMoveOut: (member: DepartmentMember) => void
  onSetAdmin: (member: DepartmentMember) => void
  onUnsetAdmin: (member: DepartmentMember) => void
}

const ADMIN_ELIGIBLE_ROLES = ['normal', 'dataset_operator']

export default function MemberRow({
  member,
  isAdmin,
  isDepartmentAdmin,
  isSelf,
  canManageAdmin,
  onMoveOut,
  onSetAdmin,
  onUnsetAdmin,
}: MemberRowProps) {
  const { t } = useTranslation()
  const canMoveOut = (isAdmin || isDepartmentAdmin) && !isSelf
  const canToggleAdmin = canManageAdmin && !isSelf
  const isEligibleForAdmin = ADMIN_ELIGIBLE_ROLES.includes(member.role)

  return (
    <div className="flex items-center gap-3 border-b border-divider-subtle px-4 py-3 last:border-b-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-state-base-hover-alt text-text-secondary system-sm-medium">
        {member.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-text-primary system-sm-medium">{member.name}</span>
          {member.is_department_admin && (
            <Badge>{t('department.admin', { ns: 'common' })}</Badge>
          )}
        </div>
        <span className="truncate text-text-tertiary system-xs-regular">{member.email}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canMoveOut && (
          <Button
            size="small"
            variant="ghost"
            onClick={() => onMoveOut(member)}
          >
            {t('department.moveOut', { ns: 'common' })}
          </Button>
        )}
        {canToggleAdmin && !member.is_department_admin && isEligibleForAdmin && (
          <Button
            size="small"
            variant="ghost"
            onClick={() => onSetAdmin(member)}
          >
            {t('department.setAdmin', { ns: 'common' })}
          </Button>
        )}
        {canToggleAdmin && member.is_department_admin && (
          <Button
            size="small"
            variant="ghost"
            destructive
            onClick={() => onUnsetAdmin(member)}
          >
            {t('department.unsetAdmin', { ns: 'common' })}
          </Button>
        )}
        {canToggleAdmin && !member.is_department_admin && !isEligibleForAdmin && (
          <Button
            size="small"
            variant="ghost"
            disabled
          >
            {t('department.setAdmin', { ns: 'common' })}
          </Button>
        )}
      </div>
    </div>
  )
}
