'use client'
import type { SystemModelEntry } from '@/contract/console/model_permissions'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import Checkbox from '@/app/components/base/checkbox'
import { Dialog, DialogCloseButton, DialogContent, DialogTitle } from '@/app/components/base/ui/dialog'
import { toast } from '@/app/components/base/ui/toast'
import { useMemberModelWhitelist, useSetMemberWhitelistMutation } from '@/service/use-model-permissions'

type ModelWhitelistModalProps = {
  accountId: string
  accountName: string
  onClose: () => void
}

const modelKey = (model: { provider: string, model: string, model_type: string }) =>
  `${model.provider}:${model.model_type}:${model.model}`

const ALL_MODELS_CHECKBOX_ID = 'model-whitelist-all'

const ModelWhitelistModal = ({ accountId, accountName, onClose }: ModelWhitelistModalProps) => {
  const { t } = useTranslation()
  const { data, isLoading } = useMemberModelWhitelist(accountId)
  const setMemberWhitelist = useSetMemberWhitelistMutation()
  // 用户未交互时（null）选中集从接口数据派生：无白名单全选，有白名单仅选白名单项
  const [overrideKeys, setOverrideKeys] = useState<Set<string> | null>(null)
  const isDirty = overrideKeys !== null

  const selectedKeys = useMemo(() => {
    if (overrideKeys)
      return overrideKeys
    if (!data)
      return new Set<string>()
    if (data.is_restricted)
      return new Set(data.whitelist.map(w => `${w.provider_name}:${w.model_type}:${w.model_name}`))
    return new Set(data.all_system_models.map(modelKey))
  }, [overrideKeys, data])

  const groups = useMemo(() => {
    const map = new Map<string, SystemModelEntry[]>()
    for (const model of data?.all_system_models ?? []) {
      const list = map.get(model.provider)
      if (list)
        list.push(model)
      else
        map.set(model.provider, [model])
    }
    return [...map.entries()]
  }, [data])

  const allKeys = useMemo(() => new Set((data?.all_system_models ?? []).map(modelKey)), [data])
  const isAllSelected = allKeys.size > 0 && [...allKeys].every(key => selectedKeys.has(key))
  const isSomeSelected = [...allKeys].some(key => selectedKeys.has(key))

  const toggleModel = (model: SystemModelEntry) => {
    const key = modelKey(model)
    const next = new Set(selectedKeys)
    if (next.has(key))
      next.delete(key)
    else
      next.add(key)
    setOverrideKeys(next)
  }

  const toggleAll = () => {
    setOverrideKeys(isAllSelected ? new Set<string>() : new Set(allKeys))
  }

  const handleSave = async () => {
    const models = (data?.all_system_models ?? [])
      .filter(model => selectedKeys.has(modelKey(model)))
      .map(model => ({ provider: model.provider, model: model.model, model_type: model.model_type }))
    try {
      await setMemberWhitelist.mutateAsync({ params: { account_id: accountId }, body: { models } })
      onClose()
    }
    catch {
      toast.error(t('model_whitelist.save_failed', { ns: 'common' }))
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open)
          onClose()
      }}
    >
      <DialogContent>
        <DialogTitle className="text-text-primary system-xl-semibold">
          {t('model_whitelist.member_title', { ns: 'common', name: accountName })}
        </DialogTitle>
        <DialogCloseButton />
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-divider-regular border-t-text-tertiary" />
          </div>
        )}
        {!isLoading && data && (
          <>
            <p className="mt-1 text-text-tertiary system-xs-regular">
              {t('model_whitelist.description', { ns: 'common' })}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Checkbox
                id={ALL_MODELS_CHECKBOX_ID}
                checked={isAllSelected}
                indeterminate={!isAllSelected && isSomeSelected}
                onCheck={toggleAll}
              />
              <span className="text-text-secondary system-sm-medium">
                {t('model_whitelist.all_models', { ns: 'common' })}
              </span>
            </div>
            <div className="mt-3 max-h-[320px] overflow-y-auto pr-1">
              {groups.map(([provider, models]) => (
                <div key={provider} className="mb-4">
                  <div className="text-text-primary system-sm-semibold">{models[0]?.label || provider}</div>
                  <div className="mt-2 space-y-2">
                    {models.map(model => (
                      <label key={modelKey(model)} className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          id={modelKey(model)}
                          checked={selectedKeys.has(modelKey(model))}
                          onCheck={() => toggleModel(model)}
                        />
                        <span className="text-text-secondary system-sm-regular">{model.label || model.model}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={onClose}>{t('operation.cancel', { ns: 'common' })}</Button>
              <Button
                variant="primary"
                disabled={!isDirty}
                loading={setMemberWhitelist.isPending}
                onClick={handleSave}
              >
                {t('operation.save', { ns: 'common' })}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ModelWhitelistModal
