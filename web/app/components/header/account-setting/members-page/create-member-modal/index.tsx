'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/base/ui/select'
import { toast } from '@/app/components/base/ui/toast'
import { useAppContext } from '@/context/app-context'
import { useProviderContext } from '@/context/provider-context'
import { useCreateMemberMutation, useDepartmentList } from '@/service/use-departments'

type CreateMemberModalProps = {
  onClose: () => void
  onSuccess: () => void
}

type TenantRole = 'editor' | 'normal' | 'dataset_operator' | 'admin'

const ALL_ROLE_OPTIONS: TenantRole[] = ['admin', 'editor', 'normal', 'dataset_operator']
const DEPT_ADMIN_ROLE_OPTIONS: TenantRole[] = ['editor', 'normal', 'dataset_operator']

const ROLE_I18N_MAP: Record<TenantRole, 'members.admin' | 'members.editor' | 'members.normal' | 'members.datasetOperator'> = {
  admin: 'members.admin',
  editor: 'members.editor',
  normal: 'members.normal',
  dataset_operator: 'members.datasetOperator',
}

export default function CreateMemberModal({ onClose, onSuccess }: CreateMemberModalProps) {
  const { t } = useTranslation()
  const { isCurrentWorkspaceOwner, isCurrentWorkspaceManager } = useAppContext()
  const { datasetOperatorEnabled } = useProviderContext()
  const { data: deptListData } = useDepartmentList()
  const createMemberMutation = useCreateMemberMutation()

  const isTenantAdmin = isCurrentWorkspaceOwner || isCurrentWorkspaceManager
  const isDepartmentAdmin = deptListData?.is_department_admin ?? false
  const canShowAdminCheckbox = isTenantAdmin

  const selectableDepartments = useMemo(
    () => {
      const ids = deptListData?.manageable_department_ids ?? []
      const depts = deptListData?.departments ?? []
      return depts.filter(d => ids.includes(d.id))
    },
    [deptListData],
  )

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [role, setRole] = useState<TenantRole>('normal')
  const [isDeptAdmin, setIsDeptAdmin] = useState(false)

  const roleOptions = useMemo(
    () => {
      const options = isDepartmentAdmin ? DEPT_ADMIN_ROLE_OPTIONS : ALL_ROLE_OPTIONS
      return datasetOperatorEnabled ? options : options.filter(r => r !== 'dataset_operator')
    },
    [isDepartmentAdmin, datasetOperatorEnabled],
  )

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('errorMsg.fieldRequired', { ns: 'common', field: t('members.name', { ns: 'common' }) }))
      return
    }
    if (!email.trim()) {
      toast.error(t('errorMsg.fieldRequired', { ns: 'common', field: t('members.email', { ns: 'common' }) }))
      return
    }
    if (!password.trim()) {
      toast.error(t('errorMsg.fieldRequired', { ns: 'common', field: t('members.initialPassword', { ns: 'common' }) }))
      return
    }
    if (!departmentId) {
      toast.error(t('errorMsg.fieldRequired', { ns: 'common', field: t('members.department', { ns: 'common' }) }))
      return
    }

    try {
      await createMemberMutation.mutateAsync({
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          department_id: departmentId,
          role,
          is_department_admin: canShowAdminCheckbox ? isDeptAdmin : undefined,
        },
      })
      toast.success(t('members.createSuccess', { ns: 'common' }))
      onSuccess()
      onClose()
    }
    catch {
      toast.error(t('members.createFailed', { ns: 'common' }))
    }
  }

  return (
    <div className="fixed inset-0 z-[1002] flex items-center justify-center bg-background-overlay" onClick={onClose}>
      <div
        className="w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl border-[0.5px] border-components-panel-border bg-components-panel-bg shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-text-primary title-2xl-semi-bold">
            {t('members.createMemberTitle', { ns: 'common' })}
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-text-secondary system-sm-medium">
                {t('members.name', { ns: 'common' })}
                <span className="text-text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('members.namePlaceholder', { ns: 'common' })}
                className="border-components-input-border h-9 w-full rounded-lg border bg-components-input-bg-normal px-3 text-text-primary outline-none system-sm-regular hover:border-components-input-border-hover focus:border-components-input-border-active"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-text-secondary system-sm-medium">
                {t('members.email', { ns: 'common' })}
                <span className="text-text-destructive">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('members.emailPlaceholder', { ns: 'common' })}
                className="border-components-input-border h-9 w-full rounded-lg border bg-components-input-bg-normal px-3 text-text-primary outline-none system-sm-regular hover:border-components-input-border-hover focus:border-components-input-border-active"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-text-secondary system-sm-medium">
                {t('members.initialPassword', { ns: 'common' })}
                <span className="text-text-destructive">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('members.initialPasswordPlaceholder', { ns: 'common' })}
                className="border-components-input-border h-9 w-full rounded-lg border bg-components-input-bg-normal px-3 text-text-primary outline-none system-sm-regular hover:border-components-input-border-hover focus:border-components-input-border-active"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-text-secondary system-sm-medium">
                {t('members.department', { ns: 'common' })}
                <span className="text-text-destructive">*</span>
              </label>
              <Select value={departmentId} onValueChange={v => setDepartmentId(v ?? '')}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder={t('members.selectDepartment', { ns: 'common' })} />
                </SelectTrigger>
                <SelectContent>
                  {selectableDepartments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-text-secondary system-sm-medium">
                {t('members.role', { ns: 'common' })}
              </label>
              <Select value={role} onValueChange={v => setRole((v as TenantRole) ?? 'normal')}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(r => (
                    <SelectItem key={r} value={r}>
                      {t(ROLE_I18N_MAP[r], { ns: 'common' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canShowAdminCheckbox && (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isDeptAdmin}
                  onChange={e => setIsDeptAdmin(e.target.checked)}
                  className="border-components-input-border h-4 w-4 rounded accent-components-checkbox-bg"
                />
                <span className="text-text-secondary system-sm-medium">
                  {t('members.setAsDepartmentAdmin', { ns: 'common' })}
                </span>
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-divider-subtle p-4">
          <Button variant="secondary" onClick={onClose}>
            {t('operation.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            loading={createMemberMutation.isPending}
            disabled={createMemberMutation.isPending}
            onClick={handleSubmit}
          >
            {t('operation.create', { ns: 'common' })}
          </Button>
        </div>
      </div>
    </div>
  )
}
