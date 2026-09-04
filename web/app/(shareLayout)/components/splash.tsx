'use client'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ChatAccessGuard from '@/app/(shareLayout)/components/chat-access-guard'
import AppUnavailable from '@/app/components/base/app-unavailable'
import Loading from '@/app/components/base/loading'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { useWebAppStore } from '@/context/web-app-context'
import { useRouter, useSearchParams } from '@/next/navigation'
import { fetchAccessToken } from '@/service/share'
import { setWebAppAccessToken, setWebAppPassport, webAppLoginStatus, webAppLogout } from '@/service/webapp-auth'

const Splash: FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
  const systemFeatures = useGlobalPublicStore(s => s.systemFeatures)
  const shareCode = useWebAppStore(s => s.shareCode)
  const webAppAccessMode = useWebAppStore(s => s.webAppAccessMode)
  const embeddedUserId = useWebAppStore(s => s.embeddedUserId)
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectUrl = searchParams.get('redirect_url')
  const message = searchParams.get('message')
  const code = searchParams.get('code')
  const tokenFromUrl = searchParams.get('web_sso_token')
  const getSigninUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('message')
    params.delete('code')
    return `/webapp-signin?${params.toString()}`
  }, [searchParams])

  const backToHome = useCallback(async () => {
    await webAppLogout(shareCode!)
    const url = getSigninUrl()
    router.replace(url)
  }, [getSigninUrl, router, shareCode])

  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    if (message) {
      setIsLoading(false)
      return
    }

    if (tokenFromUrl)
      setWebAppAccessToken(tokenFromUrl)

    const redirectOrFinish = () => {
      if (redirectUrl)
        router.replace(decodeURIComponent(redirectUrl))
      else
        setIsLoading(false)
    }

    const proceedToAuth = () => {
      setIsLoading(false)
    }

    (async () => {
      // if access mode is public, user login is always true, but the app login(passport) may be expired
      const { userLoggedIn, appLoggedIn } = await webAppLoginStatus(shareCode!, embeddedUserId || undefined)
      if (userLoggedIn && appLoggedIn) {
        redirectOrFinish()
      }
      else if (!userLoggedIn && !appLoggedIn) {
        proceedToAuth()
      }
      else if (!userLoggedIn && appLoggedIn) {
        redirectOrFinish()
      }
      else if (userLoggedIn && !appLoggedIn) {
        try {
          const { access_token } = await fetchAccessToken({
            appCode: shareCode!,
            userId: embeddedUserId || undefined,
          })
          setWebAppPassport(shareCode!, access_token)
          redirectOrFinish()
        }
        catch {
          await webAppLogout(shareCode!)
          proceedToAuth()
        }
      }
    })()
  }, [
    shareCode,
    redirectUrl,
    router,
    message,
    webAppAccessMode,
    tokenFromUrl,
    embeddedUserId,
  ])

  if (message) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-y-4">
        <AppUnavailable className="h-auto w-auto" code={code || t('common.appUnavailable', { ns: 'share' })} unknownReason={message} />
        <span className="system-sm-regular cursor-pointer text-text-tertiary" onClick={backToHome}>{code === '403' ? t('userProfile.logout', { ns: 'common' }) : t('login.backToHome', { ns: 'share' })}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading />
      </div>
    )
  }
  if (systemFeatures.department_access_control && shareCode) {
    return (
      <ChatAccessGuard appCode={shareCode}>
        {children}
      </ChatAccessGuard>
    )
  }

  return <>{children}</>
}

export default Splash
