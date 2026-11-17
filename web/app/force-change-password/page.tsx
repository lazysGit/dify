'use client'

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import Input from '@/app/components/base/input'
import { toast } from '@/app/components/base/ui/toast'
import { validPassword } from '@/config'
import { useRouter } from '@/next/navigation'
import { updateUserProfile } from '@/service/common'
import { useLogout } from '@/service/use-common'

export default function ForceChangePasswordPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { mutateAsync: logout } = useLogout()

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const showErrorMessage = useCallback((message: string) => {
    toast.error(message)
  }, [])

  const valid = useCallback(() => {
    if (!currentPassword.trim()) {
      showErrorMessage(t('error.passwordEmpty', { ns: 'login' }))
      return false
    }
    if (!password.trim()) {
      showErrorMessage(t('error.passwordEmpty', { ns: 'login' }))
      return false
    }
    if (!validPassword.test(password)) {
      showErrorMessage(t('error.passwordInvalid', { ns: 'login' }))
      return false
    }
    if (password !== confirmPassword) {
      showErrorMessage(t('account.notEqual', { ns: 'common' }))
      return false
    }
    return true
  }, [confirmPassword, currentPassword, password, showErrorMessage, t])

  const handleSubmit = async () => {
    if (!valid())
      return
    try {
      setSubmitting(true)
      await updateUserProfile({
        url: 'account/password',
        body: {
          password: currentPassword,
          new_password: password,
          repeat_new_password: confirmPassword,
        },
      })
      toast.success(t('passwordChangedTip', { ns: 'login' }))
      router.replace('/apps')
    }
    catch {
      showErrorMessage(t('newPasswordSameAsDefault', { ns: 'login' }))
    }
    finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/signin')
  }

  return (
    <div className="flex flex-col">
      <h2 className="text-text-primary title-4xl-semi-bold">{t('mustChangePasswordTitle', { ns: 'login' })}</h2>
      <p className="mt-2 text-text-secondary body-md-regular">{t('mustChangePasswordDesc', { ns: 'login' })}</p>

      <label className="mb-1 mt-6 text-text-secondary system-md-semibold">{t('account.currentPassword', { ns: 'common' })}</label>
      <Input
        type="password"
        value={currentPassword}
        onChange={e => setCurrentPassword(e.target.value)}
      />

      <label className="mb-1 mt-4 text-text-secondary system-md-semibold">{t('account.newPassword', { ns: 'common' })}</label>
      <Input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <label className="mb-1 mt-4 text-text-secondary system-md-semibold">{t('account.confirmPassword', { ns: 'common' })}</label>
      <Input
        type="password"
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
      />

      <Button
        className="mt-6 w-full"
        variant="primary"
        loading={submitting}
        disabled={submitting}
        onClick={handleSubmit}
      >
        {t('changePasswordBtn', { ns: 'login' })}
      </Button>
      <Button
        className="mt-2 w-full"
        variant="ghost"
        onClick={handleLogout}
      >
        {t('userProfile.logout', { ns: 'common' })}
      </Button>
    </div>
  )
}
