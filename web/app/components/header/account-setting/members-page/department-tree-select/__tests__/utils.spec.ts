import type { DepartmentTreeNode } from '@/contract/console/departments'
import { describe, expect, it } from 'vitest'
import {
  collectSelfAndDescendantIds,
  findNode,
  matchNameOrEmail,
  pruneTreeToIds,
} from '../utils'

const backend: DepartmentTreeNode = {
  id: 'dept-1-1',
  name: 'Backend',
  parent_id: 'dept-1',
  path: '/dept-1/dept-1-1',
  level: 1,
  is_default: false,
  member_count: 2,
  app_count: 1,
  dataset_count: 0,
  children: [],
}

const frontend: DepartmentTreeNode = {
  id: 'dept-1-2',
  name: 'Frontend',
  parent_id: 'dept-1',
  path: '/dept-1/dept-1-2',
  level: 1,
  is_default: false,
  member_count: 1,
  app_count: 0,
  dataset_count: 0,
  children: [],
}

const engineering: DepartmentTreeNode = {
  id: 'dept-1',
  name: 'Engineering',
  parent_id: null,
  path: '/dept-1',
  level: 0,
  is_default: false,
  member_count: 5,
  app_count: 3,
  dataset_count: 2,
  children: [backend, frontend],
}

const marketing: DepartmentTreeNode = {
  id: 'dept-2',
  name: 'Marketing',
  parent_id: null,
  path: '/dept-2',
  level: 0,
  is_default: false,
  member_count: 3,
  app_count: 1,
  dataset_count: 1,
  children: [],
}

const tree = [engineering, marketing]

describe('department-tree-select utils', () => {
  describe('pruneTreeToIds', () => {
    it('should keep parent-child relations among remaining nodes', () => {
      const pruned = pruneTreeToIds(tree, new Set(['dept-1', 'dept-1-1']))

      expect(pruned).toHaveLength(1)
      expect(pruned[0].id).toBe('dept-1')
      expect(pruned[0].children.map(child => child.id)).toEqual(['dept-1-1'])
    })

    it('should lift manageable children when parent is not manageable', () => {
      const pruned = pruneTreeToIds(tree, new Set(['dept-1-1']))

      expect(pruned).toHaveLength(1)
      expect(pruned[0].id).toBe('dept-1-1')
      expect(pruned[0].children).toEqual([])
    })
  })

  describe('collectSelfAndDescendantIds', () => {
    it('should include the node and all descendants', () => {
      expect(collectSelfAndDescendantIds(tree, 'dept-1')).toEqual(
        new Set(['dept-1', 'dept-1-1', 'dept-1-2']),
      )
    })

    it('should fall back to the id itself when node is missing', () => {
      expect(collectSelfAndDescendantIds(tree, 'missing')).toEqual(new Set(['missing']))
    })
  })

  describe('findNode', () => {
    it('should find a nested node', () => {
      expect(findNode(tree, 'dept-1-1')?.name).toBe('Backend')
    })

    it('should return undefined when missing', () => {
      expect(findNode(tree, 'missing')).toBeUndefined()
    })
  })

  describe('matchNameOrEmail', () => {
    it('should match name case-insensitively', () => {
      expect(matchNameOrEmail({ name: 'Owner User', email: 'a@b.com' }, 'owner')).toBe(true)
    })

    it('should match email case-insensitively', () => {
      expect(matchNameOrEmail({ name: 'Owner User', email: 'owner@example.com' }, 'OWNER@')).toBe(true)
    })

    it('should ignore surrounding whitespace', () => {
      expect(matchNameOrEmail({ name: 'Jane', email: 'jane@x.com' }, '  jane  ')).toBe(true)
    })

    it('should return true for empty keyword', () => {
      expect(matchNameOrEmail({ name: 'Jane', email: 'jane@x.com' }, '   ')).toBe(true)
    })

    it('should return false when neither field matches', () => {
      expect(matchNameOrEmail({ name: 'Jane', email: 'jane@x.com' }, 'xyz')).toBe(false)
    })
  })
})
