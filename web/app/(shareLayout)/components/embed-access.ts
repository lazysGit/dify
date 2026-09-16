let departmentAccessControlEnabled = false

export const isChatbotPath = (pathname: string) => pathname.startsWith('/chatbot')

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.')
  if (parts.length < 2)
    return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const parsed = JSON.parse(globalThis.atob(padded)) as unknown
    if (typeof parsed !== 'object' || parsed === null)
      return null
    return parsed as Record<string, unknown>
  }
  catch {
    return null
  }
}

export const isEmbedPassport = (token: string): boolean => {
  if (!token)
    return false
  return decodeJwtPayload(token)?.channel === 'embed'
}

export const setDepartmentAccessControlEnabled = (enabled: boolean) => {
  departmentAccessControlEnabled = enabled
}

export const shouldSkipWebSsoRedirect = (
  pathname: string,
  departmentAccessControl: boolean = departmentAccessControlEnabled,
) => isChatbotPath(pathname) && Boolean(departmentAccessControl)
