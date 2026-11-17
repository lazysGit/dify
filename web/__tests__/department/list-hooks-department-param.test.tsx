import { describe, expect, it, vi } from 'vitest'

type QueryConfig = { queryKey: readonly unknown[], queryFn?: unknown }
const queryConfigs: QueryConfig[] = []

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((config) => {
    queryConfigs.push(config)
    return { data: undefined, isLoading: false }
  }),
  useInfiniteQuery: vi.fn((config) => {
    queryConfigs.push(config)
    return { data: { pages: [] }, isLoading: false, fetchNextPage: vi.fn(), hasNextPage: false, isFetching: false, isFetchingNextPage: false }
  }),
  useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  keepPreviousData: undefined,
}))

describe('use-apps department_id param', () => {
  it('should include department_id in normalized params', async () => {
    queryConfigs.length = 0
    const { useInfiniteAppList } = await import('@/service/use-apps')

    useInfiniteAppList({ page: 1, limit: 30, name: '', department_id: 'dept-1' })

    const lastConfig = queryConfigs[queryConfigs.length - 1]
    expect(lastConfig.queryKey[2]).toEqual(expect.objectContaining({ department_id: 'dept-1' }))
  })

  it('should not include department_id when not provided', async () => {
    queryConfigs.length = 0
    const { useInfiniteAppList } = await import('@/service/use-apps')

    useInfiniteAppList({ page: 1, limit: 30, name: '' })

    const lastConfig = queryConfigs[queryConfigs.length - 1]
    const params = lastConfig.queryKey[2] as Record<string, unknown>
    expect(params.department_id).toBeUndefined()
  })
})

describe('use-dataset department_id param', () => {
  it('should include department_id in dataset list params', async () => {
    queryConfigs.length = 0
    const { useInfiniteDatasets } = await import('@/service/knowledge/use-dataset')

    useInfiniteDatasets({ page: 1, department_id: 'dept-1' })

    const lastConfig = queryConfigs[queryConfigs.length - 1]
    expect(lastConfig.queryKey[3]).toEqual(expect.objectContaining({ department_id: 'dept-1' }))
  })

  it('should not include department_id when not provided for datasets', async () => {
    queryConfigs.length = 0
    const { useInfiniteDatasets } = await import('@/service/knowledge/use-dataset')

    useInfiniteDatasets({ page: 1 })

    const lastConfig = queryConfigs[queryConfigs.length - 1]
    const params = lastConfig.queryKey[3] as Record<string, unknown>
    expect(params.department_id).toBeUndefined()
  })
})
