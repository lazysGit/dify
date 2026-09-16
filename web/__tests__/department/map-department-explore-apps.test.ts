import { describe, expect, it } from 'vitest'
import { mapDepartmentAppsToExploreList } from '@/service/use-departments'
import { AppModeEnum } from '@/types/app'

describe('mapDepartmentAppsToExploreList', () => {
  it('maps department-apps payload into explore app-list cards', () => {
    const data = mapDepartmentAppsToExploreList({
      department_apps: [
        {
          id: 'app-1',
          name: 'Dept Chat',
          mode: AppModeEnum.CHAT,
          icon: '🤖',
          icon_type: 'emoji',
          icon_url: null,
          icon_background: '#FFEAD5',
          description: 'published to rd',
          is_installed: false,
          is_pinned: false,
        },
      ],
    })

    expect(data.categories).toEqual([])
    expect(data.allList).toHaveLength(1)
    expect(data.allList[0].app_id).toBe('app-1')
    expect(data.allList[0].app.name).toBe('Dept Chat')
    expect(data.allList[0].app.mode).toBe(AppModeEnum.CHAT)
    expect(data.allList[0].description).toBe('published to rd')
    expect(data.allList[0].installed).toBe(false)
    expect(data.allList[0].position).toBe(0)
  })

  it('treats a missing department_apps list as empty', () => {
    const data = mapDepartmentAppsToExploreList({})
    expect(data.allList).toEqual([])
    expect(data.categories).toEqual([])
  })
})
