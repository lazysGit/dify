import { type } from '@orpc/contract'
import { base } from '../base'

export type AppSiteEmbedTokenResponse = {
  embed_token: string
  chatbot_path: string
}

export const appDeleteContract = base
  .route({
    path: '/apps/{appId}',
    method: 'DELETE',
  })
  .input(type<{
    params: {
      appId: string
    }
  }>())
  .output(type<unknown>())

export const appSiteEmbedTokenContract = base
  .route({ path: '/apps/{appId}/site/embed-token', method: 'GET' })
  .input(type<{ params: { appId: string } }>())
  .output(type<AppSiteEmbedTokenResponse>())

export const appSiteEmbedTokenResetContract = base
  .route({ path: '/apps/{appId}/site/embed-token/reset', method: 'POST' })
  .input(type<{ params: { appId: string } }>())
  .output(type<AppSiteEmbedTokenResponse>())
