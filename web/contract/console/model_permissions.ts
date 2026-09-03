import { type } from '@orpc/contract'
import { base } from '../base'

export type WhitelistModelEntry = {
  provider_name: string
  model_name: string
  model_type: string
}

export type SystemModelEntry = {
  provider: string
  model: string
  model_type: string
  label: string
}

export type MemberModelWhitelistResponse = {
  is_restricted: boolean
  whitelist: WhitelistModelEntry[]
  all_system_models: SystemModelEntry[]
}

export type SetMemberModelWhitelistInput = {
  params: { account_id: string }
  body: {
    models: Array<{ provider: string, model: string, model_type: string }>
  }
}

export type SetMemberModelWhitelistResponse = {
  result: string
  is_restricted: boolean
  whitelist_count: number
}

export type MyModelSettingsResponse = {
  available_models: SystemModelEntry[]
  is_restricted: boolean
}

export const memberModelWhitelistContract = base
  .route({
    path: '/workspaces/current/members/{account_id}/model-whitelist',
    method: 'GET',
  })
  .input(type<{
    params: { account_id: string }
  }>())
  .output(type<MemberModelWhitelistResponse>())

export const setMemberModelWhitelistContract = base
  .route({
    path: '/workspaces/current/members/{account_id}/model-whitelist',
    method: 'PUT',
  })
  .input(type<SetMemberModelWhitelistInput>())
  .output(type<SetMemberModelWhitelistResponse>())

export const myModelSettingsContract = base
  .route({
    path: '/account/model-settings',
    method: 'GET',
  })
  .output(type<MyModelSettingsResponse>())

export const modelPermissionsRouterContract = {
  getMemberWhitelist: memberModelWhitelistContract,
  setMemberWhitelist: setMemberModelWhitelistContract,
  getMyModelSettings: myModelSettingsContract,
}
