/**
 * Generic Tree Utilities
 *
 * Shared utilities for manipulating tree structures (ColumnHeaderGroup, ListingColumn, etc.)
 * All functions are generic and work with any tree node type that has an `id` and optional `children`.
 */

export interface TreeNode {
  id: string;
  children?: TreeNode[];
}

/**
 * Count leaf nodes in a tree (nodes without children)
 */
export function countLeaves<T extends TreeNode>(nodes: T[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.children?.length) {
      count += countLeaves(node.children as T[]);
    } else {
      count++;
    }
  }
  return count;
}

/**
 * Get the maximum depth of a tree
 */
export function getTreeDepth<T extends TreeNode>(nodes: T[]): number {
  if (nodes.length === 0) return 0;
  return Math.max(
    ...nodes.map((node) =>
      node.children?.length ? 1 + getTreeDepth(node.children as T[]) : 1
    )
  );
}

/**
 * Collect all leaf nodes into a flat array
 */
export function collectLeaves<T extends TreeNode>(nodes: T[]): T[] {
  const leaves: T[] = [];
  const walk = (items: T[]) => {
    for (const item of items) {
      if (item.children?.length) {
        walk(item.children as T[]);
      } else {
        leaves.push(item);
      }
    }
  };
  walk(nodes);
  return leaves;
}

/**
 * Walk the tree and call an operation on the array containing the target node.
 * Returns a new tree with the operation applied, or the original tree if not found.
 */
export function walkTree<T extends TreeNode>(
  nodes: T[],
  targetId: string,
  operation: (siblings: T[], index: number) => T[] | null
): T[] {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === targetId) {
      return operation([...nodes], i) ?? nodes;
    }
    if (nodes[i].children) {
      const result = walkTree(nodes[i].children as T[], targetId, operation);
      if (result !== nodes[i].children) {
        const arr = [...nodes];
        arr[i] = { ...arr[i], children: result };
        return arr;
      }
    }
  }
  return nodes;
}

/**
 * Update a node in the tree by ID
 */
export function updateInTree<T extends TreeNode>(
  nodes: T[],
  id: string,
  updates: Partial<T>
): T[] {
  return walkTree(nodes, id, (siblings, idx) => {
    siblings[idx] = { ...siblings[idx], ...updates };
    return siblings;
  });
}

/**
 * Delete a node from the tree by ID
 */
export function deleteFromTree<T extends TreeNode>(nodes: T[], id: string): T[] {
  return walkTree(nodes, id, (siblings, idx) => {
    siblings.splice(idx, 1);
    return siblings;
  });
}

/**
 * Add a child node to a parent node in the tree
 */
export function addChildToTree<T extends TreeNode>(
  nodes: T[],
  parentId: string,
  child: T
): T[] {
  const result = walkTree(nodes, parentId, (siblings, idx) =>
    siblings.map((s, i) =>
      i === idx
        ? { ...s, children: [...(s.children || []), child] }
        : s
    )
  );
  return result !== nodes ? result : [...nodes, child];
}

/**
 * Insert a node after another node in the tree
 */
export function insertAfterInTree<T extends TreeNode>(
  nodes: T[],
  afterId: string,
  newNode: T
): T[] {
  const result = walkTree(nodes, afterId, (siblings, idx) => {
    siblings.splice(idx + 1, 0, newNode);
    return siblings;
  });
  return result !== nodes ? result : [...nodes, newNode];
}

/**
 * Move a node up or down within its siblings
 */
export function moveInTree<T extends TreeNode>(
  nodes: T[],
  id: string,
  direction: 'up' | 'down'
): T[] {
  const delta = direction === 'up' ? -1 : 1;
  return walkTree(nodes, id, (siblings, idx) => {
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= siblings.length) return null;
    [siblings[idx], siblings[newIdx]] = [siblings[newIdx], siblings[idx]];
    return siblings;
  });
}

/**
 * Find a node in the tree by ID
 */
export function findInTree<T extends TreeNode>(nodes: T[], id: string): T | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findInTree(node.children as T[], id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Flatten a tree to a flat array (depth-first)
 */
export function flattenTree<T extends TreeNode>(nodes: T[]): T[] {
  const result: T[] = [];
  const walk = (items: T[]) => {
    for (const item of items) {
      result.push(item);
      if (item.children) {
        walk(item.children as T[]);
      }
    }
  };
  walk(nodes);
  return result;
}

/**
 * Ungroup a node - remove the group but keep its children at the same level
 */
export function ungroupInTree<T extends TreeNode>(nodes: T[], id: string): T[] {
  return walkTree(nodes, id, (siblings, idx) => {
    const node = siblings[idx];
    if (node.children?.length) {
      siblings.splice(idx, 1, ...(node.children as T[]));
    } else {
      siblings.splice(idx, 1);
    }
    return siblings;
  });
}