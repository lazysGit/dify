'use client'
import type { DefaultModelResponse } from '@/app/components/header/account-setting/model-provider-page/declarations'
import type { SystemModelEntry } from '@/contract/console/model_permissions'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import Checkbox from '@/app/components/base/checkbox'
import { Dialog, DialogCloseButton, DialogContent, DialogTitle } from '@/app/components/base/ui/dialog'
import { toast } from '@/app/components/base/ui/toast'
import { ModelTypeEnum } from '@/app/components/header/account-setting/model-provider-page/declarations'
import { useDefaultModel } from '@/app/components/header/account-setting/model-provider-page/hooks'
import { useLocale } from '@/context/i18n'
import { useProviderContext } from '@/context/provider-context'
import { renderI18nObject } from '@/i18n-config'
import { useMemberModelWhitelist, useSetMemberWhitelistMutation } from '@/service/use-model-permissions'
import { cn } from '@/utils/classnames'

type ModelWhitelistModalProps = {
  accountId: string
  accountName: string
  onClose: () => void
}

const MODEL_TYPE_ORDER = [
  ModelTypeEnum.textGeneration,
  ModelTypeEnum.textEmbedding,
  ModelTypeEnum.rerank,
  ModelTypeEnum.speech2text,
  ModelTypeEnum.tts,
] as const

type ModelTypeLabelKey
  = | 'modelProvider.systemReasoningModel.key'
    | 'modelProvider.embeddingModel.key'
    | 'modelProvider.rerankModel.key'
    | 'modelProvider.speechToTextModel.key'
    | 'modelProvider.ttsModel.key'

const MODEL_TYPE_I18N_KEY: Record<string, ModelTypeLabelKey> = {
  [ModelTypeEnum.textGeneration]: 'modelProvider.systemReasoningModel.key',
  [ModelTypeEnum.textEmbedding]: 'modelProvider.embeddingModel.key',
  [ModelTypeEnum.rerank]: 'modelProvider.rerankModel.key',
  [ModelTypeEnum.speech2text]: 'modelProvider.speechToTextModel.key',
  [ModelTypeEnum.tts]: 'modelProvider.ttsModel.key',
}

const modelKey = (model: { provider: string, model: string, model_type: string }) =>
  `${model.provider}:${model.model_type}:${model.model}`

const defaultModelKey = (model?: DefaultModelResponse) => {
  if (!model?.model || !model.model_type || !model.provider?.provider)
    return null
  return `${model.provider.provider}:${model.model_type}:${model.model}`
}

const providerFallbackName = (provider: string) =>
  provider.split('/').filter(Boolean).at(-1) || provider

const ALL_MODELS_CHECKBOX_ID = 'model-whitelist-all'

const ModelWhitelistModal = ({ accountId, accountName, onClose }: ModelWhitelistModalProps) => {
  const { t } = useTranslation()
  const locale = useLocale()
  const { modelProviders } = useProviderContext()
  const { data, isLoading } = useMemberModelWhitelist(accountId)
  const { data: llmDefault, isLoading: llmDefaultLoading } = useDefaultModel(ModelTypeEnum.textGeneration)
  const { data: embeddingDefault, isLoading: embeddingDefaultLoading } = useDefaultModel(ModelTypeEnum.textEmbedding)
  const { data: rerankDefault, isLoading: rerankDefaultLoading } = useDefaultModel(ModelTypeEnum.rerank)
  const { data: speech2textDefault, isLoading: speech2textDefaultLoading } = useDefaultModel(ModelTypeEnum.speech2text)
  const { data: ttsDefault, isLoading: ttsDefaultLoading } = useDefaultModel(ModelTypeEnum.tts)
  const setMemberWhitelist = useSetMemberWhitelistMutation()
  // 用户未交互时（null）选中集从接口数据派生：始终包含系统默认模型；有白名单时再并入白名单项
  const [overrideKeys, setOverrideKeys] = useState<Set<string> | null>(null)
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set())
  const isDirty = overrideKeys !== null
  const defaultsLoading = llmDefaultLoading
    || embeddingDefaultLoading
    || rerankDefaultLoading
    || speech2textDefaultLoading
    || ttsDefaultLoading
  const showLoading = isLoading || defaultsLoading

  const defaultKeys = useMemo(() => {
    const catalog = new Set((data?.all_system_models ?? []).map(modelKey))
    const keys = new Set<string>()
    for (const model of [llmDefault, embeddingDefault, rerankDefault, speech2textDefault, ttsDefault]) {
      const key = defaultModelKey(model)
      if (key && catalog.has(key))
        keys.add(key)
    }
    return keys
  }, [data, llmDefault, embeddingDefault, rerankDefault, speech2textDefault, ttsDefault])

  const selectedKeys = useMemo(() => {
    if (overrideKeys)
      return overrideKeys
    if (!data)
      return new Set<string>()
    const keys = data.is_restricted
      ? new Set(data.whitelist.map(w => `${w.provider_name}:${w.model_type}:${w.model_name}`))
      : new Set<string>()
    for (const key of defaultKeys)
      keys.add(key)
    return keys
  }, [overrideKeys, data, defaultKeys])

  const groups = useMemo(() => {
    const byType = new Map<string, Map<string, SystemModelEntry[]>>()
    for (const model of data?.all_system_models ?? []) {
      let byProvider = byType.get(model.model_type)
      if (!byProvider) {
        byProvider = new Map()
        byType.set(model.model_type, byProvider)
      }
      const list = byProvider.get(model.provider)
      if (list)
        list.push(model)
      else
        byProvider.set(model.provider, [model])
    }
    const knownTypes = new Set<string>(MODEL_TYPE_ORDER)
    const orderedTypes = [
      ...MODEL_TYPE_ORDER.filter(type => byType.has(type)),
      ...[...byType.keys()].filter(type => !knownTypes.has(type)),
    ]
    return orderedTypes.map(modelType => ({
      modelType,
      labelKey: MODEL_TYPE_I18N_KEY[modelType],
      providers: [...(byType.get(modelType)?.entries() ?? [])].map(([provider, models]) => ({
        provider,
        models,
      })),
    }))
  }, [data])

  const providerNameById = useMemo(() => {
    const language = locale.replace('-', '_')
    const map = new Map<string, string>()
    for (const item of modelProviders ?? []) {
      const name = renderI18nObject(item.label, language)
      if (name)
        map.set(item.provider, name)
    }
    return map
  }, [locale, modelProviders])

  const allKeys = useMemo(() => new Set((data?.all_system_models ?? []).map(modelKey)), [data])
  const isAllSelected = allKeys.size > 0 && [...allKeys].every(key => selectedKeys.has(key))
  const isSomeSelected = [...allKeys].some(key => selectedKeys.has(key))

  const toggleModel = (model: SystemModelEntry) => {
    const key = modelKey(model)
    if (defaultKeys.has(key))
      return
    const next = new Set(selectedKeys)
    if (next.has(key))
      next.delete(key)
    else
      next.add(key)
    setOverrideKeys(next)
  }

  const toggleAll = () => {
    setOverrideKeys(isAllSelected ? new Set(defaultKeys) : new Set(allKeys))
  }

  const toggleTypeCollapsed = (modelType: string) => {
    setCollapsedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(modelType))
        next.delete(modelType)
      else
        next.add(modelType)
      return next
    })
  }

  const handleSave = async () => {
    const models = (data?.all_system_models ?? [])
      .filter(model => selectedKeys.has(modelKey(model)) || defaultKeys.has(modelKey(model)))
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
        {showLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-divider-regular border-t-text-tertiary" />
          </div>
        )}
        {!showLoading && data && (
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
              {groups.map((typeGroup) => {
                const collapsed = collapsedTypes.has(typeGroup.modelType)
                return (
                  <div key={typeGroup.modelType} className="mb-4">
                    <button
                      type="button"
                      className="flex items-center text-text-primary system-sm-semibold"
                      aria-expanded={!collapsed}
                      onClick={() => toggleTypeCollapsed(typeGroup.modelType)}
                    >
                      {typeGroup.labelKey ? t(typeGroup.labelKey, { ns: 'common' }) : typeGroup.modelType}
                      <span className={cn('i-custom-vender-solid-general-arrow-down-round-fill h-4 w-4 text-text-quaternary', collapsed && '-rotate-90')} />
                    </button>
                    {!collapsed && typeGroup.providers.map(providerGroup => (
                      <div key={`${typeGroup.modelType}:${providerGroup.provider}`} className="mt-2">
                        <div className="text-text-tertiary system-xs-medium">
                          {providerNameById.get(providerGroup.provider) || providerFallbackName(providerGroup.provider)}
                        </div>
                        <div className="mt-2 space-y-2">
                          {providerGroup.models.map((model) => {
                            const locked = defaultKeys.has(modelKey(model))
                            return (
                              <label
                                key={modelKey(model)}
                                className={cn('flex items-center gap-2', locked ? 'cursor-not-allowed' : 'cursor-pointer')}
                              >
                                <Checkbox
                                  id={modelKey(model)}
                                  checked={selectedKeys.has(modelKey(model)) || locked}
                                  disabled={locked}
                                  onCheck={() => toggleModel(model)}
                                />
                                <span className="text-text-secondary system-sm-regular">{model.label || model.model}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
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
