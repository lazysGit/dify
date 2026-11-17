'use client'

import { useTranslation } from 'react-i18next'
import { useAppContext } from '@/context/app-context'
import { useGlobalPublicStore } from '@/context/global-public-context'

const CurrentDepartmentPath = () => {
  const { t } = useTranslation()
  const { currentWorkspace } = useAppContext()
  const systemFeatures = useGlobalPublicStore(s => s.systemFeatures)
  const departmentPath = currentWorkspace.department_path

  if (!systemFeatures.department_access_control || !departmentPath)
    return null

  return (
    <div
      className="ml-2 min-w-0 max-w-[220px] truncate text-text-tertiary system-xs-regular"
      title={departmentPath}
      aria-label={t('department.currentPath', { ns: 'common' })}
    >
      {departmentPath}
    </div>
  )
}

export default CurrentDepartmentPath
