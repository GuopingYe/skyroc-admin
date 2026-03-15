"""
RBAC 种子数据脚本

初始化：
1. 默认角色（Super Admin, Admin, Study Lead, Programmer, QC Reviewer, Viewer）
2. 权限列表
3. 默认管理员用户（从环境变量读取用户名密码）
"""
import asyncio
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.database import async_session_factory
from app.models import Permission, Role, User


# ============================================================
# 权限定义
# ============================================================

PERMISSIONS_DATA = [
    # 项目管理
    {"code": "ta:create", "name": "Create TA", "category": "project", "description": "Create top-level Therapeutic Area"},
    {"code": "ta:delete", "name": "Delete TA", "category": "project", "description": "Delete Therapeutic Area"},
    {"code": "study:create", "name": "Create Study", "category": "project", "description": "Create new study under compound"},
    {"code": "study:delete", "name": "Delete Study", "category": "project", "description": "Delete study and all child nodes"},
    {"code": "study:lock", "name": "Lock Study", "category": "project", "description": "Lock study to prevent modifications"},
    {"code": "node:archive", "name": "Archive Node", "category": "project", "description": "Archive any pipeline node"},

    # 元数据管理
    {"code": "spec:edit", "name": "Edit Specification", "category": "metadata", "description": "Edit study specification"},
    {"code": "spec:view", "name": "View Specification", "category": "metadata", "description": "View study specification"},
    {"code": "sdr:import", "name": "Import SDR", "category": "metadata", "description": "Import SDR data"},
    {"code": "mapping:edit", "name": "Edit Mapping", "category": "metadata", "description": "Edit SDTM mapping rules"},
    {"code": "mapping:view", "name": "View Mapping", "category": "metadata", "description": "View SDTM mapping rules"},
    {"code": "mapping:export", "name": "Export Mapping", "category": "metadata", "description": "Export mapping definitions"},

    # QC 管理
    {"code": "issue:create", "name": "Create Issue", "category": "qc", "description": "Create QC issues"},
    {"code": "issue:respond", "name": "Respond Issue", "category": "qc", "description": "Respond to QC issues"},
    {"code": "issue:close", "name": "Close Issue", "category": "qc", "description": "Close QC issues"},
    {"code": "deliverable:signoff", "name": "Sign Off", "category": "qc", "description": "Sign off on deliverables"},

    # 系统管理
    {"code": "user:manage", "name": "Manage Users", "category": "admin", "description": "Create, edit, delete users"},
    {"code": "role:assign", "name": "Assign Roles", "category": "admin", "description": "Assign roles to users"},
    {"code": "audit:view", "name": "View Audit Log", "category": "admin", "description": "View system audit logs"},

    # PR 审批
    {"code": "pr:create", "name": "Create PR", "category": "project", "description": "Create pull request"},
    {"code": "pr:approve", "name": "Approve PR", "category": "project", "description": "Approve pull request"},
    {"code": "pr:reject", "name": "Reject PR", "category": "project", "description": "Reject pull request"},

    # TFL 构建
    {"code": "tfl:create", "name": "Create TFL", "category": "metadata", "description": "Create TFL output"},
    {"code": "tfl:edit", "name": "Edit TFL", "category": "metadata", "description": "Edit TFL output"},
]


# ============================================================
# 角色定义
# ============================================================

ROLES_DATA = [
    {
        "code": "SUPER_ADMIN",
        "name": "Super Admin",
        "description": "Full system access with all permissions including user management",
        "is_system": True,
        "color": "magenta",
        "sort_order": 1,
        "permissions": [p["code"] for p in PERMISSIONS_DATA],  # 所有权限
    },
    {
        "code": "ADMIN",
        "name": "Admin",
        "description": "Administrative access for assigned scope",
        "is_system": True,
        "color": "red",
        "sort_order": 2,
        "permissions": [
            "study:create", "study:lock", "node:archive",
            "spec:edit", "spec:view", "sdr:import", "mapping:edit", "mapping:view", "mapping:export",
            "issue:create", "issue:respond", "issue:close", "deliverable:signoff",
        ],
    },
    {
        "code": "STUDY_LEAD",
        "name": "Study Lead",
        "description": "Lead programmer responsible for study deliverables",
        "is_system": True,
        "color": "purple",
        "sort_order": 3,
        "permissions": [
            "spec:edit", "spec:view", "sdr:import", "mapping:edit", "mapping:view", "mapping:export",
            "issue:respond", "deliverable:signoff",
        ],
    },
    {
        "code": "PROGRAMMER",
        "name": "Programmer",
        "description": "Primary programmer for TFL outputs and mapping",
        "is_system": True,
        "color": "blue",
        "sort_order": 4,
        "permissions": [
            "spec:edit", "spec:view", "mapping:edit", "mapping:view", "issue:respond",
        ],
    },
    {
        "code": "QC_REVIEWER",
        "name": "QC Reviewer",
        "description": "Quality control reviewer for outputs",
        "is_system": True,
        "color": "green",
        "sort_order": 5,
        "permissions": [
            "spec:view", "mapping:view", "issue:create", "issue:close", "deliverable:signoff",
        ],
    },
    {
        "code": "VIEWER",
        "name": "Viewer",
        "description": "Read-only access to assigned scope",
        "is_system": True,
        "color": "default",
        "sort_order": 6,
        "permissions": [
            "spec:view", "mapping:view",
        ],
    },
]


# ============================================================
# 默认用户
# ============================================================

def get_default_users():
    """获取默认用户配置（从环境变量读取）"""
    return [
        {
            "username": settings.DEFAULT_ADMIN_USERNAME,
            "password": settings.DEFAULT_ADMIN_PASSWORD,
            "email": settings.DEFAULT_ADMIN_EMAIL,
            "display_name": "System Admin",
            "is_superuser": True,
            "is_active": True,
            "department": "IT Department",
        },
    ]


async def seed_rbac_data(db: AsyncSession) -> dict:
    """
    执行 RBAC 种子数据初始化

    Returns:
        统计信息
    """
    stats = {
        "permissions_created": 0,
        "roles_created": 0,
        "users_created": 0,
    }

    # 1. 创建权限
    print("📝 Creating permissions...")
    existing_perms = await db.execute(select(Permission))
    existing_perm_codes = {p.code for p in existing_perms.scalars().all()}

    for perm_data in PERMISSIONS_DATA:
        if perm_data["code"] not in existing_perm_codes:
            perm = Permission(**perm_data)
            db.add(perm)
            stats["permissions_created"] += 1

    await db.flush()

    # 获取所有权限用于角色关联
    perms_result = await db.execute(select(Permission))
    permissions_map = {p.code: p for p in perms_result.scalars().all()}

    # 2. 创建角色
    print("👥 Creating roles...")
    existing_roles = await db.execute(select(Role))
    existing_role_codes = {r.code for r in existing_roles.scalars().all()}

    for role_data in ROLES_DATA:
        if role_data["code"] not in existing_role_codes:
            perm_codes = role_data.pop("permissions", [])
            role = Role(**role_data)

            # 关联权限
            for perm_code in perm_codes:
                if perm_code in permissions_map:
                    role.permissions.append(permissions_map[perm_code])

            db.add(role)
            stats["roles_created"] += 1

    await db.flush()

    # 3. 创建默认用户
    print("👤 Creating default users...")
    existing_users = await db.execute(select(User))
    existing_users_list = existing_users.scalars().all()
    existing_usernames = {u.username for u in existing_users_list}

    default_users = get_default_users()
    for user_data in default_users:
        password = user_data.get("password")
        password_hash = hash_password(password) if password else None

        if user_data["username"] not in existing_usernames:
            # 创建新用户
            user_data_copy = user_data.copy()
            user_data_copy.pop("password", None)
            user = User(**user_data_copy, password_hash=password_hash, created_by="system")
            db.add(user)
            stats["users_created"] += 1
        else:
            # 更新现有用户的密码（如果没有密码）
            for existing_user in existing_users_list:
                if existing_user.username == user_data["username"] and existing_user.password_hash is None:
                    existing_user.password_hash = password_hash
                    print(f"   Updated password for existing user: {user_data['username']}")

    await db.commit()

    return stats


async def main():
    """主函数"""
    print("🚀 Starting RBAC seed data...")

    async with async_session_factory() as db:
        stats = await seed_rbac_data(db)

    print(f"""
✅ RBAC seed data completed!

📊 Statistics:
   - Permissions created: {stats['permissions_created']}
   - Roles created: {stats['roles_created']}
   - Users created: {stats['users_created']}

🔐 Default superuser:
   Username: {settings.DEFAULT_ADMIN_USERNAME}
   Email: {settings.DEFAULT_ADMIN_EMAIL}

⚠️  Please change the default password after first login!
""")


if __name__ == "__main__":
    asyncio.run(main())