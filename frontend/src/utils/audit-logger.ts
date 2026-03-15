/** Audit Logger - 审计日志工具 用于记录系统中所有关键操作，满足 21 CFR Part 11 合规要求 */

export interface AuditLogEntry {
  action: string;
  details?: string;
  entityId: string;
  entityName: string;
  entityType: string;
  newValue?: string;
  oldValue?: string;
  timestamp: string;
  userId: string;
  userName: string;
}

/** 当前用户信息（Mock） */
const getCurrentUser = () => ({
  userId: 'user-001',
  userName: 'admin@pharma.com'
});

/**
 * 记录审计日志
 *
 * @param action 操作类型
 * @param entityType 实体类型
 * @param entityId 实体ID
 * @param entityName 实体名称
 * @param oldValue 旧值
 * @param newValue 新值
 * @param details 详细信息
 */
export const auditLog = (
  action: string,
  entityType: string,
  entityId: string,
  entityName: string,
  oldValue?: string,
  newValue?: string,
  details?: string
) => {
  const user = getCurrentUser();
  const entry: AuditLogEntry = {
    action,
    details,
    entityId,
    entityName,
    entityType,
    newValue,
    oldValue,
    timestamp: new Date().toISOString(),
    userId: user.userId,
    userName: user.userName
  };

  // 当前仅打印到控制台，后续可接入后端 API
  console.log(`[Audit Log] User ${entry.userName} ${action} ${entityType} "${entityName}" (${entityId})`, {
    details,
    from: oldValue || 'N/A',
    to: newValue || 'N/A'
  });

  // TODO: 发送到后端审计日志服务
  // await api.post('/audit-logs', entry);

  return entry;
};

/** 预定义操作类型 */
export const AuditActions = {
  ARCHIVE: 'archived',
  ASSIGN_ROLE: 'assigned role',
  CREATE: 'created',
  DELETE: 'deleted',
  LOCK: 'locked',
  REMOVE_ROLE: 'removed role',
  RESTORE: 'restored',
  STATUS_CHANGE: 'changed status',
  UNLOCK: 'unlocked',
  UPDATE: 'updated'
} as const;

/** 实体类型 */
export const EntityTypes = {
  ANALYSIS: 'Analysis',
  COMPOUND: 'Compound',
  MAPPING: 'Mapping',
  PERMISSION: 'Permission',
  ROLE: 'Role',
  SPEC_VARIABLE: 'Spec Variable',
  STUDY: 'Study',
  TA: 'Therapeutic Area',
  USER: 'User'
} as const;

export default auditLog;
