import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import CurrentDepartmentPath from '../index'

let mockDepartmentPath: string | null = null
let mockDepartmentAccessControl = true

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/context/app-context', () => ({
  useAppContext: () => ({
    currentWorkspace: {
      department_path: mockDepartmentPath,
    },
  }),
}))

vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: (selector: (s: { systemFeatures: { department_access_control: boolean } }) => unknown) =>
    selector({
      systemFeatures: {
        department_access_control: mockDepartmentAccessControl,
      },
    }),
}))

describe('CurrentDepartmentPath', () => {
  beforeEach(() => {
    mockDepartmentPath = null
    mockDepartmentAccessControl = true
  })

  it('should render the full department path next to workspace when feature is enabled', () => {
    mockDepartmentPath = '研发部/前端组'
    render(<CurrentDepartmentPath />)

    const path = screen.getByLabelText('department.currentPath')
    expect(path).toHaveTextContent('研发部/前端组')
    expect(path).toHaveAttribute('title', '研发部/前端组')
  })

  it('should hide when department access control is disabled', () => {
    mockDepartmentAccessControl = false
    mockDepartmentPath = '研发部/前端组'
    render(<CurrentDepartmentPath />)

    expect(screen.queryByLabelText('department.currentPath')).not.toBeInTheDocument()
  })

  it('should hide when the current user has no department path', () => {
    mockDepartmentPath = null
    render(<CurrentDepartmentPath />)

    expect(screen.queryByLabelText('department.currentPath')).not.toBeInTheDocument()
  })
})
