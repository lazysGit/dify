'use client'

import type { DepartmentTreeNode } from '@/contract/console/departments'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import { toast } from '@/app/components/base/ui/toast'
import { useUpdateDepartmentMutation } from '@/service/use-departments'

type EditDepartmentModalProps = {
  department: DepartmentTreeNode
  onClose: () => void
}

export default function EditDepartmentModal({ department, onClose }: EditDepartmentModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(department.name)
  const [description, setDescription] = useState(department.description ?? '')
  const [nameError, setNameError] = useState('')
  const updateMutation = useUpdateDepartmentMutation()

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError(t('department.nameRequired', { ns: 'common' }))
      return
    }
    setNameError('')

    try {
      await updateMutation.mutateAsync({
        params: { id: department.id },
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      })
      toast.success(t('department.updateSuccess', { ns: 'common' }))
      onClose()
    }
    catch {
      toast.error(t('department.updateFailed', { ns: 'common' }))
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
            {t('department.editDepartment', { ns: 'common' })}
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-text-secondary system-sm-medium">
                {t('department.name', { ns: 'common' })}
                <span className="text-text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError('')
                }}
                placeholder={t('department.namePlaceholder', { ns: 'common' })}
                className={`h-9 w-full rounded-lg border bg-components-input-bg-normal px-3 text-text-primary outline-none system-sm-regular hover:border-components-input-border-hover focus:border-components-input-border-active ${nameError ? 'border-components-input-border-destructive' : 'border-components-input-border'}`}
                autoFocus
              />
              {nameError && (
                <span className="text-text-destructive system-xs-regular">{nameError}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-text-secondary system-sm-medium">
                {t('department.description', { ns: 'common' })}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('department.descriptionPlaceholder', { ns: 'common' })}
                rows={3}
                className="border-components-input-border resize-none rounded-lg border bg-components-input-bg-normal px-3 py-2 text-text-primary outline-none system-sm-regular hover:border-components-input-border-hover focus:border-components-input-border-active"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-divider-subtle p-4">
          <Button variant="secondary" onClick={onClose}>
            {t('operation.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending}
            onClick={handleSubmit}
          >
            {t('operation.save', { ns: 'common' })}
          </Button>
        </div>
      </div>
    </div>
  )
}
