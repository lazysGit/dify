'use client'
import type { SystemModelEntry } from '@/contract/console/model_permissions'
import { useTranslation } from 'react-i18next'
import { useMyModelSettings } from '@/service/use-model-permissions'

const ModelSettingsPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useMyModelSettings()

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-divider-regular border-t-text-tertiary" />
      </div>
    )
  }

  if (!data.is_restricted) {
    return (
      <div className="p-8">
        <div className="text-text-secondary system-sm-regular">{t('my_available_models.unrestricted', { ns: 'common' })}</div>
      </div>
    )
  }

  const groups = new Map<string, SystemModelEntry[]>()
  for (const model of data.available_models) {
    const list = groups.get(model.provider)
    if (list)
      list.push(model)
    else
      groups.set(model.provider, [model])
  }

  return (
    <div className="p-8">
      <div className="text-text-secondary system-sm-regular">{t('my_available_models.restricted_hint', { ns: 'common' })}</div>
      {groups.size === 0 && (
        <div className="mt-4 text-text-tertiary system-sm-regular">{t('my_available_models.no_models', { ns: 'common' })}</div>
      )}
      {[...groups.entries()].map(([provider, models]) => (
        <div key={provider} className="mt-6">
          <div className="text-text-primary system-sm-semibold">{models[0]?.label || provider}</div>
          <ul className="mt-2 space-y-1">
            {models.map(model => (
              <li key={`${model.model_type}:${model.model}`} className="text-text-secondary system-sm-regular">
                {model.label || model.model}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default ModelSettingsPage
