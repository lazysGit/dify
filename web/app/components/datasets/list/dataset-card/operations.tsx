import { RiArrowLeftRightLine, RiDeleteBinLine, RiEditLine, RiFileDownloadLine } from '@remixicon/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Divider from '@/app/components/base/divider'
import OperationItem from './operation-item'

type OperationsProps = {
  showDelete: boolean
  showExportPipeline: boolean
  showTransferDepartment: boolean
  openRenameModal: () => void
  handleExportPipeline: () => void
  detectIsUsedByApp: () => void
  openTransferDepartment: () => void
}

const Operations = ({
  showDelete,
  showExportPipeline,
  showTransferDepartment,
  openRenameModal,
  handleExportPipeline,
  detectIsUsedByApp,
  openTransferDepartment,
}: OperationsProps) => {
  const { t } = useTranslation()

  return (
    <div className="relative flex w-full flex-col rounded-xl border-[0.5px] border-components-panel-border bg-components-panel-bg-blur shadow-lg shadow-shadow-shadow-5">
      <div className="flex flex-col p-1">
        <OperationItem
          Icon={RiEditLine}
          name={t('operation.edit', { ns: 'common' })}
          handleClick={openRenameModal}
        />
        {showExportPipeline && (
          <OperationItem
            Icon={RiFileDownloadLine}
            name={t('operations.exportPipeline', { ns: 'datasetPipeline' })}
            handleClick={handleExportPipeline}
          />
        )}
        {showTransferDepartment && (
          <OperationItem
            Icon={RiArrowLeftRightLine}
            name={t('transferDepartmentAction', { ns: 'app' })}
            handleClick={openTransferDepartment}
          />
        )}
      </div>
      {showDelete && (
        <>
          <Divider type="horizontal" className="my-0 bg-divider-subtle" />
          <div className="flex flex-col p-1">
            <OperationItem
              Icon={RiDeleteBinLine}
              name={t('operation.delete', { ns: 'common' })}
              handleClick={detectIsUsedByApp}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default React.memo(Operations)
