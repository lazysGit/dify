import type { App, AppCategory } from '@/models/explore'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale } from '@/context/i18n'
import { consoleClient, consoleQuery } from '@/service/client'

export const useDepartmentList = () => {
  return useQuery(consoleQuery.departments.list.queryOptions({}))
}

export const useCreateDepartmentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.list.key(),
      })
    },
  }))
}

export const useUpdateDepartmentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.update.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.list.key(),
      })
    },
  }))
}

export const useDeleteDepartmentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.remove.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.list.key(),
      })
    },
  }))
}

export const useMoveDepartmentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.move.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.list.key(),
      })
    },
  }))
}

export const useMoveMemberMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.moveMember.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.members.key(),
      })
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.list.key(),
      })
    },
  }))
}

export const useSetAdminMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.setAdmin.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.list.key(),
      })
    },
  }))
}

export const useUnsetAdminMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.unsetAdmin.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.list.key(),
      })
    },
  }))
}

export const useCreateMemberMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.createMember.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.list.key(),
      })
    },
  }))
}

export const useTransferAppMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.transferApp.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.list.key(),
      })
    },
  }))
}

export const useTransferDatasetMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.transferDataset.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.list.key(),
      })
    },
  }))
}

export const useInvalidateDepartmentList = () => {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({
      queryKey: consoleQuery.departments.list.key(),
    })
  }
}

export const useDepartmentMembers = (id: string) => {
  return useQuery(consoleQuery.departments.members.queryOptions({
    input: { params: { id } },
  }))
}

export const useMemberCreatedResources = (memberId: string) => {
  return useQuery(consoleQuery.departments.createdResources.queryOptions({
    input: { params: { id: memberId } },
  }))
}

export const useMemberOperationLogs = (memberId: string) => {
  return useQuery(consoleQuery.departments.operationLogs.queryOptions({
    input: { params: { id: memberId } },
  }))
}

export const useDepartmentOperationLogs = (id: string) => {
  return useQuery(consoleQuery.departments.departmentOperationLogs.queryOptions({
    input: { params: { id } },
  }))
}

type DepartmentExploreAppsData = {
  categories: AppCategory[]
  allList: App[]
}

export const useDepartmentExploreApps = () => {
  const locale = useLocale()
  const input = locale
    ? { query: { language: locale } }
    : {}
  const language = input?.query?.language

  return useQuery<DepartmentExploreAppsData>({
    queryKey: [...consoleQuery.explore.departmentApps.queryKey({ input }), language],
    queryFn: async () => {
      const result = await consoleClient.explore.departmentApps(input)
      return {
        categories: result.categories,
        allList: [...result.recommended_apps].sort((a, b) => a.position - b.position),
      }
    },
  })
}

export const usePublishDepartments = (appId: string) => {
  return useQuery(consoleQuery.departments.publishApps.queryOptions({
    input: { params: { id: appId } },
  }))
}

export const useUpdatePublishDepartmentsMutation = (appId: string) => {
  const queryClient = useQueryClient()
  return useMutation(consoleQuery.departments.updatePublishApps.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: consoleQuery.departments.publishApps.queryKey({ input: { params: { id: appId } } }),
      })
    },
  }))
}
