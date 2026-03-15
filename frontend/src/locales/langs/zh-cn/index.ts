import common from './common';
import form from './form';
import page from './page';
import route from './route';
import theme from './theme';

const local: App.I18n.Schema['translation'] = {
  common,
  datatable: {
    itemCount: '共 {{total}} 条'
  },
  dropdown: {
    closeAll: '关闭所有',
    closeCurrent: '关闭',
    closeLeft: '关闭左侧',
    closeOther: '关闭其它',
    closeRight: '关闭右侧'
  },
  form,
  icon: {
    collapse: '折叠菜单',
    expand: '展开菜单',
    fullscreen: '全屏',
    fullscreenExit: '退出全屏',
    lang: '切换语言',
    pin: '固定',
    reload: '刷新页面',
    themeConfig: '主题配置',
    themeSchema: '主题模式',
    unpin: '取消固定'
  },
  page,
  request: {
    logout: '请求失败后登出用户',
    logoutMsg: '用户状态失效，请重新登录',
    logoutWithModal: '请求失败后弹出模态框再登出用户',
    logoutWithModalMsg: '用户状态失效，请重新登录',
    refreshToken: '请求的token已过期，刷新token',
    tokenExpired: 'token已过期'
  },
  route,
  system: {
    errorReason: '错误原因',
    pipelineManagement: {
      lifecycleStatus: '生命周期状态',
      lockedWarning: '该节点已锁定，不允许修改。'
    },
    reload: '重新渲染页面',
    title: 'Skyroc 管理系统',
    updateCancel: '稍后再说',
    updateConfirm: '立即刷新',
    updateContent: '检测到系统有新版本发布，是否立即刷新页面？',
    updateTitle: '系统版本更新通知',
    userManagement: {
      addUser: '新增用户',
      assignPermission: '权限',
      cols: {
        action: '操作',
        department: '部门',
        lastLogin: '最后登录',
        permissions: '权限',
        status: '状态',
        user: '用户'
      },
      delete: '删除',
      deleteConfirm: '确定要删除该用户吗？',
      deleteSuccess: '用户删除成功',
      edit: '编辑',
      editModal: {
        cancel: '取消',
        department: '部门',
        displayName: '显示名称',
        displayNameRequired: '请输入显示名称',
        email: '邮箱',
        emailInvalid: '请输入有效的邮箱地址',
        emailRequired: '请输入邮箱',
        save: '保存',
        saveSuccess: '用户更新成功',
        status: '状态',
        title: '编辑用户'
      },
      filters: {
        allStatus: '全部状态'
      },
      noPermissions: '未分配权限',
      permission: {
        assign: '分配',
        assignSuccess: '权限分配成功',
        cancel: '取消',
        currentPermissions: '当前权限',
        hint: '从树中选择管线节点并分配角色，用户将自动获得所选节点下所有子节点的访问权限。',
        rolePlaceholder: '请选择角色...',
        selectNode: '选择管线节点',
        selectRequired: '请选择节点和角色',
        selectRole: '选择角色',
        title: '分配权限'
      },
      // 权限分类
      permissionCategories: {
        admin: '系统管理',
        metadata: '元数据管理',
        project: '项目管理',
        qc: 'QC 管理'
      },
      // 权限标签和描述
      permissions: {
        archive_node: { description: '归档任何管线节点', label: '归档节点' },
        assign_roles: { description: '为用户分配角色', label: '分配角色' },
        close_issue: { description: '关闭 QC 问题', label: '关闭问题' },
        create_study: { description: '在化合物下创建新研究', label: '创建研究' },
        create_ta: { description: '创建顶级治疗领域', label: '创建 TA' },
        delete_study: { description: '删除研究及所有子节点', label: '删除研究' },
        delete_ta: { description: '删除治疗领域', label: '删除 TA' },
        edit_mapping: { description: '编辑 SDTM 映射规则', label: '编辑映射' },
        edit_spec: { description: '编辑研究规范', label: '编辑规范' },
        export_mapping: { description: '导出映射定义', label: '导出映射' },
        import_sdr: { description: '导入 SDR 数据', label: '导入 SDR' },
        lock_study: { description: '锁定研究以防止修改', label: '锁定研究' },
        manage_users: { description: '创建、编辑、删除用户', label: '管理用户' },
        open_issue: { description: '创建 QC 问题', label: '创建问题' },
        respond_issue: { description: '回复 QC 问题', label: '回复问题' },
        sign_off: { description: '签收交付物', label: '签收' },
        view_audit_log: { description: '查看系统审计日志', label: '查看审计日志' }
      },
      rolePermission: {
        permissionMatrix: '权限矩阵',
        roleList: '角色列表',
        save: '保存',
        saveSuccess: '权限保存成功',
        selectRoleHint: '请从左侧列表选择角色',
        superAdminOnly: '仅超级管理员可修改权限',
        systemRole: '系统',
        title: '角色权限配置'
      },
      // 角色标签和描述
      roles: {
        Admin: { description: '拥有分配作用域的管理权限', label: '管理员' },
        Programmer: { description: '负责 TFL 输出和映射的主要程序员', label: '程序员' },
        QCReviewer: { description: '输出物的质量控制审核员', label: 'QC 审核员' },
        StudyLead: { description: '负责研究交付物的主要程序员', label: '研究负责人' },
        SuperAdmin: { description: '拥有全部系统权限，包括用户管理', label: '超级管理员' },
        Viewer: { description: '对分配作用域只读访问', label: '查看者' }
      },
      // 作用域节点类型
      scopeNodes: {
        Analysis: '分析',
        Compound: '化合物',
        Study: '研究',
        TA: '治疗领域'
      },
      searchPlaceholder: '搜索姓名、邮箱...',
      stats: {
        active: '活跃',
        inactive: '未激活',
        locked: '已锁定',
        total: '总用户数'
      },
      // 用户状态标签
      status: {
        Active: '活跃',
        Inactive: '未激活',
        Locked: '已锁定'
      },
      title: '用户管理'
    }
  },
  theme
};

export default local;
