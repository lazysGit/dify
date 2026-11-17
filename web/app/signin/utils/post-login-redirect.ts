let postLoginRedirect: string | null = null

export const setPostLoginRedirect = (value: string | null) => {
  postLoginRedirect = value
}

export const resolvePostLoginRedirect = () => {
  if (postLoginRedirect) {
    const redirectUrl = postLoginRedirect
    postLoginRedirect = null
    return redirectUrl
  }

  return null
}

export const resolveLoginLandingPath = (mustChangePassword?: boolean) => {
  if (mustChangePassword)
    return '/force-change-password'
  return resolvePostLoginRedirect() || '/apps'
}
