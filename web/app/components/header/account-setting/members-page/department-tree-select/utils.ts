import type { DepartmentTreeNode } from '@/contract/console/departments'

export function pruneTreeToIds(nodes: DepartmentTreeNode[], ids: Set<string>): DepartmentTreeNode[] {
  const result: DepartmentTreeNode[] = []
  for (const node of nodes) {
    const children = pruneTreeToIds(node.children, ids)
    if (ids.has(node.id))
      result.push({ ...node, children })
    else
      result.push(...children)
  }
  return result
}

export function findNode(nodes: DepartmentTreeNode[], id: string): DepartmentTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id)
      return node
    const found = findNode(node.children, id)
    if (found)
      return found
  }
  return undefined
}

function collectIds(node: DepartmentTreeNode, ids: Set<string>) {
  ids.add(node.id)
  for (const child of node.children)
    collectIds(child, ids)
}

export function collectSelfAndDescendantIds(nodes: DepartmentTreeNode[], id: string): Set<string> {
  const node = findNode(nodes, id)
  if (!node)
    return new Set([id])
  const ids = new Set<string>()
  collectIds(node, ids)
  return ids
}

export function matchNameOrEmail(account: { name?: string, email?: string }, keyword: string): boolean {
  const query = keyword.trim().toLowerCase()
  if (!query)
    return true
  const name = account.name || ''
  const email = account.email || ''
  return name.toLowerCase().includes(query) || email.toLowerCase().includes(query)
}
