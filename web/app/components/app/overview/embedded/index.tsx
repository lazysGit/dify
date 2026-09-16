import type { SiteInfo } from '@/models/share'
import {
  RiClipboardFill,
  RiClipboardLine,
} from '@remixicon/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import copy from 'copy-to-clipboard'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ActionButton from '@/app/components/base/action-button'
import Button from '@/app/components/base/button'
import { useThemeContext } from '@/app/components/base/chat/embedded-chatbot/theme/theme-context'
import Modal from '@/app/components/base/modal'
import Tooltip from '@/app/components/base/tooltip'
import {
  AlertDialog,
  AlertDialogActions,
  AlertDialogCancelButton,
  AlertDialogConfirmButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/app/components/base/ui/alert-dialog'
import { IS_CE_EDITION } from '@/config'
import { useAppContext } from '@/context/app-context'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { consoleQuery } from '@/service/client'
import { cn } from '@/utils/classnames'
import { basePath } from '@/utils/var'
import style from './style.module.css'

type Props = {
  siteInfo?: SiteInfo
  isShow: boolean
  onClose: () => void
  accessToken: string
  appBaseUrl: string
  appId?: string
  className?: string
}

const withEmbedToken = (chatbotPath: string, embedToken?: string) =>
  embedToken ? `${chatbotPath}?embed_token=${embedToken}` : chatbotPath

const OPTION_MAP = {
  iframe: {
    getContent: (url: string, token: string, _primaryColor?: string, _isTestEnv?: boolean, embedToken?: string) =>
      `<iframe
 src="${withEmbedToken(`${url}${basePath}/chatbot/${token}`, embedToken)}"
 style="width: 100%; height: 100%; min-height: 700px"
 frameborder="0"
 allow="microphone">
</iframe>`,
  },
  scripts: {
    getContent: (url: string, token: string, primaryColor: string, isTestEnv?: boolean, embedToken?: string) =>
      `<script>
 window.difyChatbotConfig = {
  token: '${token}'${embedToken
    ? `,
  embedToken: '${embedToken}'`
    : ''}${isTestEnv
    ? `,
  isDev: true`
    : ''}${IS_CE_EDITION
    ? `,
  baseUrl: '${url}${basePath}'`
    : ''},
  inputs: {
    // You can define the inputs from the Start node here
    // key is the variable name
    // e.g.
    // name: "NAME"
  },
  systemVariables: {
    // user_id: 'YOU CAN DEFINE USER ID HERE',
    // conversation_id: 'YOU CAN DEFINE CONVERSATION ID HERE, IT MUST BE A VALID UUID',
  },
  userVariables: {
    // avatar_url: 'YOU CAN DEFINE USER AVATAR URL HERE',
    // name: 'YOU CAN DEFINE USER NAME HERE',
  },
 }
</script>
<script
 src="${url}${basePath}/embed.min.js"
 id="${token}"
 defer>
</script>
<style>
  #dify-chatbot-bubble-button {
    background-color: ${primaryColor} !important;
  }
  #dify-chatbot-bubble-window {
    width: 24rem !important;
    height: 40rem !important;
  }
</style>`,
  },
  chromePlugin: {
    getContent: (url: string, token: string, _primaryColor?: string, _isTestEnv?: boolean, embedToken?: string) =>
      `ChatBot URL: ${withEmbedToken(`${url}${basePath}/chatbot/${token}`, embedToken)}`,
  },
}
const prefixEmbedded = 'overview.appInfo.embedded'

type Option = keyof typeof OPTION_MAP

type OptionStatus = {
  iframe: boolean
  scripts: boolean
  chromePlugin: boolean
}

const Embedded = ({ siteInfo, isShow, onClose, appBaseUrl, accessToken, appId, className }: Props) => {
  const { t } = useTranslation()
  const [option, setOption] = useState<Option>('iframe')
  const [isCopied, setIsCopied] = useState<OptionStatus>({ iframe: false, scripts: false, chromePlugin: false })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const queryClient = useQueryClient()

  const departmentAccessControl = useGlobalPublicStore(s => s.systemFeatures.department_access_control)
  const { data: embedTokenPayload } = useQuery(consoleQuery.apps.embedToken.queryOptions({
    input: { params: { appId: appId ?? '' } },
    enabled: departmentAccessControl && isShow && !!appId,
  }))
  const resetEmbedToken = useMutation(consoleQuery.apps.resetEmbedToken.mutationOptions({
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: consoleQuery.apps.embedToken.key(),
      })
    },
  }))
  const embedToken = embedTokenPayload?.embed_token

  const { langGeniusVersionInfo } = useAppContext()
  const themeBuilder = useThemeContext()
  themeBuilder.buildTheme(siteInfo?.chat_color_theme ?? null, siteInfo?.chat_color_theme_inverted ?? false)
  const isTestEnv = langGeniusVersionInfo.current_env === 'TESTING' || langGeniusVersionInfo.current_env === 'DEVELOPMENT'
  const snippet = OPTION_MAP[option].getContent(
    appBaseUrl,
    accessToken,
    themeBuilder.theme?.primaryColor ?? '#1C64F2',
    isTestEnv,
    embedToken,
  )
  const onClickCopy = () => {
    if (option === 'chromePlugin') {
      const splitUrl = snippet.split(': ')
      if (splitUrl.length > 1)
        copy(splitUrl[1])
    }
    else {
      copy(snippet)
    }
    setIsCopied({ ...isCopied, [option]: true })
  }
  const onResetEmbedToken = () => {
    if (!appId)
      return
    setShowResetConfirm(true)
  }
  const onConfirmResetEmbedToken = () => {
    if (appId)
      resetEmbedToken.mutate({ params: { appId } })
    setShowResetConfirm(false)
  }

  // when toggle option, reset then copy status
  const resetCopyStatus = () => {
    const cache = { ...isCopied }
    Object.keys(cache).forEach((key) => {
      cache[key as keyof OptionStatus] = false
    })
    setIsCopied(cache)
  }

  const navigateToChromeUrl = () => {
    window.open('https://chrome.google.com/webstore/detail/dify-chatbot/ceehdapohffmjmkdcifjofadiaoeggaf', '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    resetCopyStatus()
  }, [isShow])

  return (
    <Modal
      title={t(`${prefixEmbedded}.title`, { ns: 'appOverview' })}
      isShow={isShow}
      onClose={onClose}
      className="w-[640px] !max-w-2xl"
      wrapperClassName={className}
      closable={true}
    >
      <div className="mb-4 mt-8 text-text-primary system-sm-medium">
        {t(`${prefixEmbedded}.explanation`, { ns: 'appOverview' })}
      </div>
      {departmentAccessControl && (
        <div className="mb-4">
          <Button size="small" onClick={onResetEmbedToken}>
            {t(`${prefixEmbedded}.reset`, { ns: 'appOverview' })}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-y-2">
        {Object.keys(OPTION_MAP).map((v, index) => {
          return (
            <div
              key={index}
              className={cn(
                style.option,
                style[`${v}Icon`],
                option === v && style.active,
              )}
              onClick={() => {
                setOption(v as Option)
                resetCopyStatus()
              }}
            >
            </div>
          )
        })}
      </div>
      {option === 'chromePlugin' && (
        <div className="mt-6 w-full">
          <div className={cn('inline-flex w-full items-center justify-center gap-2 rounded-lg py-3', 'shrink-0 cursor-pointer bg-primary-600 text-white hover:bg-primary-600/75 hover:shadow-sm')}>
            <div className={`relative h-4 w-4 ${style.pluginInstallIcon}`}></div>
            <div className="font-['Inter'] text-sm font-medium leading-tight text-white" onClick={navigateToChromeUrl}>{t(`${prefixEmbedded}.chromePlugin`, { ns: 'appOverview' })}</div>
          </div>
        </div>
      )}
      <div className={cn('inline-flex w-full flex-col items-start justify-start rounded-lg border-[0.5px] border-components-panel-border bg-background-section', 'mt-6')}>
        <div className="inline-flex items-center justify-start gap-2 self-stretch rounded-t-lg bg-background-section-burn py-1 pl-3 pr-1">
          <div className="shrink-0 grow text-text-secondary system-sm-medium">
            {t(`${prefixEmbedded}.${option}`, { ns: 'appOverview' })}
          </div>
          <Tooltip
            popupContent={
              (isCopied[option]
                ? t(`${prefixEmbedded}.copied`, { ns: 'appOverview' })
                : t(`${prefixEmbedded}.copy`, { ns: 'appOverview' })) || ''
            }
          >
            <ActionButton>
              <div
                onClick={onClickCopy}
              >
                {isCopied[option] && <RiClipboardFill className="h-4 w-4" />}
                {!isCopied[option] && <RiClipboardLine className="h-4 w-4" />}
              </div>
            </ActionButton>
          </Tooltip>
        </div>
        <div className="flex w-full items-start justify-start gap-2 overflow-x-auto p-3">
          <div className="shrink grow basis-0 font-mono text-[13px] leading-tight text-text-secondary">
            <pre className="select-text">{snippet}</pre>
          </div>
        </div>
      </div>
      {showResetConfirm && (
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <div className="flex flex-col items-start gap-2 self-stretch pb-4 pl-6 pr-6 pt-6">
              <AlertDialogTitle className="w-full text-text-primary title-2xl-semi-bold">
                {t(`${prefixEmbedded}.reset`, { ns: 'appOverview' })}
              </AlertDialogTitle>
              <AlertDialogDescription className="w-full whitespace-pre-wrap break-words text-text-tertiary system-md-regular">
                {t(`${prefixEmbedded}.resetConfirm`, { ns: 'appOverview' })}
              </AlertDialogDescription>
            </div>
            <AlertDialogActions>
              <AlertDialogCancelButton>
                {t('operation.cancel', { ns: 'common' })}
              </AlertDialogCancelButton>
              <AlertDialogConfirmButton
                loading={resetEmbedToken.isPending}
                disabled={resetEmbedToken.isPending}
                onClick={onConfirmResetEmbedToken}
              >
                {t('operation.confirm', { ns: 'common' })}
              </AlertDialogConfirmButton>
            </AlertDialogActions>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Modal>
  )
}

export default Embedded
