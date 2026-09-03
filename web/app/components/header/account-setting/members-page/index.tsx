'use client'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/app/components/base/avatar'
import Button from '@/app/components/base/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/base/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/base/ui/tooltip'
import { NUM_INFINITE } from '@/app/components/billing/config'
import { Plan } from '@/app/components/billing/type'
import UpgradeBtn from '@/app/components/billing/upgrade-btn'
import { useAppContext } from '@/context/app-context'
import { useLocale } from '@/context/i18n'
import { useProviderContext } from '@/context/provider-context'
import { useFormatTimeFromNow } from '@/hooks/use-format-time-from-now'
import { LanguagesSupported } from '@/i18n-config/language'
import { useMembers } from '@/service/use-common'
import { useDepartmentList } from '@/service/use-departments'
import CreateMemberModal from './create-member-modal'
import EditWorkspaceModal from './edit-workspace-modal'
import ModelWhitelistModal from './model-whitelist-modal'
import Operation from './operation'
import TransferOwnership from './operation/transfer-ownership'
import TransferOwnershipModal from './transfer-ownership-modal'

const MembersPage = () => {
  const { t } = useTranslation()
  const RoleMap = {
    owner: t('members.owner', { ns: 'common' }),
    admin: t('members.admin', { ns: 'common' }),
    editor: t('members.editor', { ns: 'common' }),
    dataset_operator: t('members.datasetOperator', { ns: 'common' }),
    normal: t('members.normal', { ns: 'common' }),
  }
  const locale = useLocale()

  const { userProfile, currentWorkspace, isCurrentWorkspaceOwner, isCurrentWorkspaceManager } = useAppContext()
  const { data, refetch } = useMembers()
  const { formatTimeFromNow } = useFormatTimeFromNow()
  const accounts = data?.accounts || []
  const { plan, enableBilling, isAllowTransferWorkspace } = useProviderContext()
  const isNotUnlimitedMemberPlan = enableBilling && plan.type !== Plan.team && plan.type !== Plan.enterprise
  const isMemberFull = enableBilling && isNotUnlimitedMemberPlan && accounts.length >= plan.total.teamMembers
  const [editWorkspaceModalVisible, setEditWorkspaceModalVisible] = useState(false)
  const [showTransferOwnershipModal, setShowTransferOwnershipModal] = useState(false)

  const departmentListQuery = useDepartmentList()
  const departments = departmentListQuery.data?.departments ?? []
  const manageableDepartmentIds = departmentListQuery.data?.manageable_department_ids ?? []
  const isDepartmentAdmin = departmentListQuery.data?.is_department_admin ?? false
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('')

  const deptNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of departments)
      map[d.id] = d.name
    return map
  }, [departments])

  const filteredAccounts = useMemo(() => {
    if (!selectedDepartmentId)
      return accounts
    return accounts.filter(a => a.department_id === selectedDepartmentId)
  }, [accounts, selectedDepartmentId])

  const canCreateMember = isCurrentWorkspaceOwner || isCurrentWorkspaceManager || isDepartmentAdmin
  const [showCreateMemberModal, setShowCreateMemberModal] = useState(false)
  const canManageModelPermission = isCurrentWorkspaceOwner || isCurrentWorkspaceManager
  const [modelPermissionAccount, setModelPermissionAccount] = useState<{ id: string, name: string } | null>(null)

  return (
    <>
      <div className="flex flex-col">
        <div className="mb-4 flex items-center gap-3 rounded-xl border-l-[0.5px] border-t-[0.5px] border-divider-subtle bg-gradient-to-r from-background-gradient-bg-fill-chat-bg-2 to-background-gradient-bg-fill-chat-bg-1 p-3 pr-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-components-icon-bg-blue-solid text-[20px]">
            <span className="bg-gradient-to-r from-components-avatar-shape-fill-stop-0 to-components-avatar-shape-fill-stop-100 bg-clip-text font-semibold uppercase text-shadow-shadow-1 opacity-90">{currentWorkspace?.name[0]?.toLocaleUpperCase()}</span>
          </div>
          <div className="grow">
            <div className="flex items-center gap-1 text-text-secondary system-md-semibold">
              <span>{currentWorkspace?.name}</span>
              {isCurrentWorkspaceOwner && (
                <span>
                  <Tooltip>
                    <TooltipTrigger
                      render={(
                        <div
                          className="cursor-pointer rounded-md p-1 hover:bg-black/5"
                          onClick={() => {
                            setEditWorkspaceModalVisible(true)
                          }}
                        >
                          <div
                            data-testid="edit-workspace-pencil"
                            className="i-ri-pencil-line h-4 w-4 text-text-tertiary"
                          />
                        </div>
                      )}
                    />
                    <TooltipContent>
                      {t('account.editWorkspaceInfo', { ns: 'common' })}
                    </TooltipContent>
                  </Tooltip>
                </span>
              )}
            </div>
            <div className="mt-1 text-text-tertiary system-xs-medium">
              {enableBilling && isNotUnlimitedMemberPlan
                ? (
                    <div className="flex space-x-1">
                      <div>
                        {t('plansCommon.member', { ns: 'billing' })}
                        {locale !== LanguagesSupported[1] && accounts.length > 1 && 's'}
                      </div>
                      <div className="">{accounts.length}</div>
                      <div>/</div>
                      <div>{plan.total.teamMembers === NUM_INFINITE ? t('plansCommon.unlimited', { ns: 'billing' }) : plan.total.teamMembers}</div>
                    </div>
                  )
                : (
                    <div className="flex space-x-1">
                      <div>{accounts.length}</div>
                      <div>
                        {t('plansCommon.memberAfter', { ns: 'billing' })}
                        {locale !== LanguagesSupported[1] && accounts.length > 1 && 's'}
                      </div>
                    </div>
                  )}
            </div>

          </div>
          {isMemberFull && (
            <UpgradeBtn className="mr-2" loc="member-invite" />
          )}
          <div className="shrink-0">
            {canCreateMember && (
              <Button variant="primary" onClick={() => setShowCreateMemberModal(true)}>
                <span className="i-ri-user-add-line mr-1 h-4 w-4" />
                {t('members.createMember', { ns: 'common' })}
              </Button>
            )}
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Select value={selectedDepartmentId} onValueChange={v => setSelectedDepartmentId(v ?? '')}>
            <SelectTrigger className="h-8 w-[200px] rounded-lg">
              <SelectValue placeholder={t('members.allDepartments', { ns: 'common' })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                {t('members.allDepartments', { ns: 'common' })}
              </SelectItem>
              {manageableDepartmentIds.map((id) => {
                const dept = departments.find(d => d.id === id)
                if (!dept)
                  return null
                return (
                  <SelectItem key={id} value={id}>
                    {dept.name}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-visible lg:overflow-visible">
          <div className="flex min-w-[480px] items-center border-b border-divider-regular py-[7px]">
            <div className="grow px-3 text-text-tertiary system-xs-medium-uppercase">{t('members.name', { ns: 'common' })}</div>
            <div className="w-[104px] shrink-0 text-text-tertiary system-xs-medium-uppercase">{t('members.lastActive', { ns: 'common' })}</div>
            <div className="w-[96px] shrink-0 px-3 text-text-tertiary system-xs-medium-uppercase">{t('members.role', { ns: 'common' })}</div>
            {canManageModelPermission && (
              <div className="w-[104px] shrink-0 px-3 text-text-tertiary system-xs-medium-uppercase">{t('members.model_permission', { ns: 'common' })}</div>
            )}
          </div>
          <div className="relative min-w-[480px]">
            {
              filteredAccounts.map(account => (
                <div key={account.id} className="flex border-b border-divider-subtle">
                  <div className="flex grow items-center px-3 py-2">
                    <Avatar avatar={account.avatar_url} size="sm" className="mr-2" name={account.name} />
                    <div className="">
                      <div className="text-text-secondary system-sm-medium">
                        {account.name}
                        {account.status === 'pending' && <span className="ml-1 text-text-warning system-xs-medium">{t('members.pending', { ns: 'common' })}</span>}
                        {userProfile.email === account.email && <span className="text-text-tertiary system-xs-regular">{t('members.you', { ns: 'common' })}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-text-tertiary system-xs-regular">
                        <span>{account.email}</span>
                        {account.department_id && deptNameMap[account.department_id] && (
                          <>
                            <span className="text-divider-regular">/</span>
                            <span>{deptNameMap[account.department_id]}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex w-[104px] shrink-0 items-center py-2 text-text-secondary system-sm-regular">{formatTimeFromNow(Number((account.last_active_at || account.created_at)) * 1000)}</div>
                  <div className="flex w-[96px] shrink-0 items-center">
                    {isCurrentWorkspaceOwner && account.role === 'owner' && isAllowTransferWorkspace && (
                      <TransferOwnership onOperate={() => setShowTransferOwnershipModal(true)}></TransferOwnership>
                    )}
                    {isCurrentWorkspaceOwner && account.role === 'owner' && !isAllowTransferWorkspace && (
                      <div className="px-3 text-text-secondary system-sm-regular">{RoleMap[account.role] || RoleMap.normal}</div>
                    )}
                    {isCurrentWorkspaceOwner && account.role !== 'owner' && (
                      <Operation member={account} operatorRole={currentWorkspace.role} onOperate={refetch} isDepartmentAdmin={isDepartmentAdmin} />
                    )}
                    {!isCurrentWorkspaceOwner && (
                      <div className="px-3 text-text-secondary system-sm-regular">{RoleMap[account.role] || RoleMap.normal}</div>
                    )}
                  </div>
                  {canManageModelPermission && (
                    <div className="flex w-[104px] shrink-0 items-center px-3">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setModelPermissionAccount({ id: account.id, name: account.name })}
                      >
                        {t('members.model_permission', { ns: 'common' })}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      </div>
      {
        editWorkspaceModalVisible && (
          <EditWorkspaceModal
            onCancel={() => setEditWorkspaceModalVisible(false)}
          />
        )
      }
      {showTransferOwnershipModal && (
        <TransferOwnershipModal
          show={showTransferOwnershipModal}
          onClose={() => setShowTransferOwnershipModal(false)}
        />
      )}
      {showCreateMemberModal && (
        <CreateMemberModal
          onClose={() => setShowCreateMemberModal(false)}
          onSuccess={refetch}
        />
      )}
      {modelPermissionAccount && (
        <ModelWhitelistModal
          accountId={modelPermissionAccount.id}
          onClose={() => setModelPermissionAccount(null)}
        />
      )}
    </>
  )
}

export default MembersPage
