'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Loading from '@/app/components/base/loading'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { useRouter } from '@/next/navigation'

type ChatAccessState = 'loading' | 'granted' | 'denied' | 'not_found'

const ChatAccessGuard = ({
  appCode,
  children,
}: {
  appCode: string
  children: React.ReactNode
}) => {
  const { t } = useTranslation()
  const systemFeatures = useGlobalPublicStore(s => s.systemFeatures)
  const router = useRouter()
  const flagEnabled = systemFeatures.department_access_control
  const [state, setState] = useState<ChatAccessState>(() => flagEnabled ? 'loading' : 'granted')
  const mountedRef = useRef(false)

  const redirectToLogin = useCallback(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''
    router.replace(`/signin?redirect=${encodeURIComponent(currentPath)}`)
  }, [router])

  useEffect(() => {
    if (!flagEnabled)
      return

    mountedRef.current = true
    const controller = new AbortController()

    const verify = async () => {
      try {
        const res = await fetch(`/api/chat-access/verify?app_code=${encodeURIComponent(appCode)}`, {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!mountedRef.current)
          return

        if (res.status === 401) {
          redirectToLogin()
          return
        }

        if (res.status === 403) {
          setState('denied')
          return
        }

        if (res.status === 404) {
          setState('not_found')
          return
        }

        if (res.ok) {
          const data = await res.json()
          if (!mountedRef.current)
            return
          if (data.access) {
            setState('granted')
          }
          else {
            if (data.code === 'not_found')
              setState('not_found')
            else
              setState('denied')
          }
        }
        else {
          setState('denied')
        }
      }
      catch {
        if (mountedRef.current && !controller.signal.aborted)
          setState('denied')
      }
    }

    verify()

    return () => {
      mountedRef.current = false
      controller.abort()
    }
  }, [appCode, flagEnabled, redirectToLogin])

  if (!flagEnabled || state === 'granted')
    return <>{children}</>

  if (state === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-y-4">
        <div className="text-text-primary system-md-semibold">{t('common.accessDenied', { ns: 'share' })}</div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => router.replace('/')}
        >
          {t('common.returnToConsole', { ns: 'share' })}
        </button>
      </div>
    )
  }

  if (state === 'not_found') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-y-4">
        <div className="text-text-primary system-md-semibold">{t('common.appNotFound', { ns: 'share' })}</div>
      </div>
    )
  }

  return <>{children}</>
}

export default ChatAccessGuard
