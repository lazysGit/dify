import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { consoleQuery } from '@/service/client'

export const useMemberModelWhitelist = (accountId: string) => {
  return useQuery(consoleQuery.modelPermissions.getMemberWhitelist.queryOptions({
    input: { params: { account_id: accountId } },
  }))
}

export const useSetMemberWhitelistMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.modelPermissions.setMemberWhitelist.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.modelPermissions.getMemberWhitelist.key(),
      })
      queryClient.invalidateQueries({
        queryKey: consoleQuery.modelPermissions.getMyModelSettings.key(),
      })
    },
  }))
}

export const useMyModelSettings = () => {
  return useQuery(consoleQuery.modelPermissions.getMyModelSettings.queryOptions())
}

export const useInvalidateModelWhitelist = () => {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({
      queryKey: consoleQuery.modelPermissions.getMemberWhitelist.key(),
    })
  }
}
