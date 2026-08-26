'use client'

import type { DepartmentMember, DepartmentTreeNode } from '@/contract/console/departments'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import { useDepartmentMembers } from '@/service/use-departments'
import MoveDepartmentModal from '../move-department-modal'
import MoveMemberModal from '../move-member-modal'
import MemberRow from './member-row'
import SubDepartmentList from './sub-department-list'

type DepartmentDetailProps = {
  department: DepartmentTreeNode
  currentUserId: string
  isAdmin: boolean
  isDepartmentAdmin: boolean
  manageableDepartmentIds: string[]
  tree: DepartmentTreeNode[]
  onBack: () => void
  onNavigateToSubDepartment: (id: string) => void
}

export default function DepartmentDetail({
  department,
  currentUserId,
  isAdmin,
  isDepartmentAdmin,
  manageableDepartmentIds,
  tree,
  onBack,
  onNavigateToSubDepartment,
}: DepartmentDetailProps) {
  const { t } = useTranslation()
  const { data: membersData, isLoading } = useDepartmentMembers(department.id)
  const [moveMemberTarget, setMoveMemberTarget] = useState<DepartmentMember | null>(null)
  const [showMoveDepartment, setShowMoveDepartment] = useState(false)

  const members = membersData?.members ?? []
  const canEdit = isAdmin || isDepartmentAdmin
  const canManageAdmin = isAdmin

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          size="small"
          variant="ghost"
          onClick={onBack}
        >
          <span className="i-ri-arrow-left-line mr-1 h-4 w-4" />
          {t('department.back', { ns: 'common' })}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-text-primary title-2xl-semi-bold">
          {department.name}
        </h2>
        {canEdit && (
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button
                size="small"
                variant="ghost"
                onClick={() => setShowMoveDepartment(true)}
              >
                {t('department.moveDepartment', { ns: 'common' })}
              </Button>
            )}
            <Button size="small" variant="ghost">
              {t('department.editDepartment', { ns: 'common' })}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-xl border border-divider-subtle p-4">
          <span className="i-ri-group-line h-5 w-5 text-text-tertiary" />
          <span className="mt-1 text-text-primary title-2xl-semi-bold">{department.member_count}</span>
          <span className="text-text-tertiary system-xs-regular">{t('department.memberCount', { ns: 'common' })}</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-divider-subtle p-4">
          <span className="i-ri-robot-line h-5 w-5 text-text-tertiary" />
          <span className="mt-1 text-text-primary title-2xl-semi-bold">{department.app_count}</span>
          <span className="text-text-tertiary system-xs-regular">{t('department.appCount', { ns: 'common' })}</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-divider-subtle p-4">
          <span className="i-ri-database-2-line h-5 w-5 text-text-tertiary" />
          <span className="mt-1 text-text-primary title-2xl-semi-bold">{department.dataset_count}</span>
          <span className="text-text-tertiary system-xs-regular">{t('department.datasetCount', { ns: 'common' })}</span>
        </div>
      </div>

      <SubDepartmentList
        departments={department.children.filter(c => !c.is_default)}
        onManage={onNavigateToSubDepartment}
      />

      <div className="flex flex-col">
        <h3 className="mb-2 text-text-primary system-sm-medium">
          {t('department.memberCount', { ns: 'common' })}
        </h3>

        {isLoading
          ? (
              <div className="flex items-center justify-center py-8">
                <span className="i-ri-loader-4-line h-6 w-6 animate-spin text-text-tertiary" />
              </div>
            )
          : members.length === 0
            ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
                  <span className="i-ri-group-line mb-2 h-8 w-8" />
                  {isAdmin
                    ? (
                        <>
                          <p className="mb-3 system-sm-regular">{t('department.noMembersAdmin', { ns: 'common' })}</p>
                          <Button variant="primary" size="small">
                            <span className="i-ri-add-line mr-1 h-4 w-4" />
                            {t('department.createMember', { ns: 'common' })}
                          </Button>
                        </>
                      )
                    : (
                        <p className="system-sm-regular">{t('department.noMembersNormal', { ns: 'common' })}</p>
                      )}
                </div>
              )
            : (
                <div className="rounded-xl border border-divider-subtle">
                  {members.map(member => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      isAdmin={isAdmin}
                      isDepartmentAdmin={isDepartmentAdmin}
                      isSelf={member.id === currentUserId}
                      canManageAdmin={canManageAdmin}
                      onMoveOut={m => setMoveMemberTarget(m)}
                      onSetAdmin={() => {}}
                      onUnsetAdmin={() => {}}
                    />
                  ))}
                </div>
              )}
      </div>

      {moveMemberTarget && (
        <MoveMemberModal
          member={moveMemberTarget}
          currentDepartmentId={department.id}
          tree={tree}
          manageableDepartmentIds={manageableDepartmentIds}
          isAdmin={isAdmin}
          onClose={() => setMoveMemberTarget(null)}
        />
      )}

      {showMoveDepartment && (
        <MoveDepartmentModal
          departmentId={department.id}
          tree={tree}
          onClose={() => setShowMoveDepartment(false)}
        />
      )}
    </div>
  )
}
