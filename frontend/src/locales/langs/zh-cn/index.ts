import common from './common';
import form from './form';
import page from './page';
import request from './request';
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
  request,
  route,
  system: {
    errorReason: '错误原因',
    pipelineManagement: {
      lifecycleStatus: '生命周期状态',
      lockedWarning: '该节点已锁定，不允许修改。'
    },
    reload: '重新渲染页面',
    tflDesigner: {
      // Analysis categories
      categories: {
        adverseEvents: '不良事件',
        all: '所有分类',
        baseline: '基线特征',
        concomitantMeds: '合并用药',
        demographics: '人口统计学',
        disposition: '受试者脱落',
        ecg: '心电图',
        efficacy: '疗效',
        laboratory: '实验室',
        pk: '药代动力学',
        protocolDeviations: '方案偏离',
        vitalSigns: '生命体征'
      },
      // Common
      common: {
        add: '添加',
        all: '全部',
        apply: '应用',
        cancel: '取消',
        close: '关闭',
        confirm: '确认',
        delete: '删除',
        edit: '编辑',
        error: '错误',
        export: '导出',
        import: '导入',
        save: '保存',
        search: '搜索',
        success: '成功',
        templates: '模板',
        warning: '警告'
      },
      // Display types
      displayTypes: {
        figure: '图形',
        listing: '列表',
        table: '表格'
      },
      // Errors
      errors: {
        invalidJSON: '无效的 JSON 文件',
        parseError: '解析文件错误'
      },
      // Export formats
      exportFormats: {
        allDisplays: '全部输出',
        excel: 'Excel (.xlsx)',
        pdf: 'PDF',
        rtf: 'RTF',
        selectedDisplay: '已选输出',
        word: 'Word (.docx)'
      },
      // Figure
      figure: {
        addSeries: '添加系列',
        axes: '坐标轴',
        chartType: '图表类型',
        chartTypes: {
          bar: '柱状图',
          box: '箱线图',
          forest: '森林图',
          km_curve: 'Kaplan-Meier 曲线',
          line: '折线图',
          scatter: '散点图',
          violin: '小提琴图',
          waterfall: '瀑布图'
        },
        color: '颜色',
        dashed: '虚线',
        deleteSeries: '删除系列',
        dotted: '点线',
        line: '线条',
        marker: '标记',
        reorder: '重新排序',
        series: '系列',
        solid: '实线',
        title: '图形',
        xAxis: 'X 轴',
        yAxis: 'Y 轴'
      },
      // Header styles
      headerStyles: {
        alignment: '对齐',
        clinicalResearch: '临床研究',
        columnHeaderBackground: '列标题背景',
        columnHeaderFont: '列标题字体',
        columnHeaderSize: '列标题字号',
        custom: '自定义',
        default: '默认',
        fdaStandard: 'FDA 标准',
        minimal: '简约',
        preview: '预览',
        professional: '专业',
        subtitleFont: '副标题字体',
        subtitleSize: '副标题字号',
        title: '表头样式',
        titleFont: '标题字体',
        titleSize: '标题字号'
      },
      // Listing
      listing: {
        addColumn: '添加列',
        addFilterRule: '添加筛选规则',
        addSortRule: '添加排序规则',
        alignment: '对齐',
        ascending: '升序',
        booleanType: '布尔',
        center: '居中对齐',
        column: '列',
        columns: '列',
        dataType: '数据类型',
        dateType: '日期',
        deleteColumn: '删除列',
        deleteFilterRule: '删除筛选规则',
        deleteSortRule: '删除排序规则',
        descending: '降序',
        exitFullscreen: '退出全屏',
        exportCSV: '导出为 CSV',
        filter: '筛选',
        filterColumn: '列',
        filterRules: '筛选规则',
        fullscreen: '全屏',
        label: '标签',
        left: '左对齐',
        logic: '逻辑',
        moveDown: '下移',
        moveToBottom: '移至底部',
        moveToTop: '移至顶部',
        moveUp: '上移',
        numberType: '数值',
        operator: '操作符',
        operators: {
          contains: '包含',
          ends_with: '结束为',
          eq: '等于 (=)',
          ge: '大于等于 (≥)',
          gt: '大于 (>)',
          in: '在...中',
          is_null: '为空',
          le: '小于等于 (≤)',
          lt: '小于 (<)',
          ne: '不等于 (≠)',
          not_null: '不为空',
          starts_with: '起始为'
        },
        pageSize: '每页数量',
        priority: '优先级',
        right: '右对齐',
        sort: '排序',
        sortOrder: '排序',
        sortRules: '排序规则',
        stringType: '字符串',
        title: '列表',
        value: '值',
        variable: '变量',
        visible: '可见',
        width: '宽度'
      },
      // Messages
      messages: {
        atLeastOneFilter: '至少保留一条筛选规则',
        atLeastOneRow: '至少保留一行',
        atLeastOneSortRule: '至少保留一条排序规则',
        exportSuccess: '导出成功',
        headerStyleUpdated: '表头样式已更新',
        importError: '导入失败',
        importFileError: '导入文件错误',
        importSuccess: '导入成功',
        populationAdded: '人群已添加',
        populationDeleted: '人群已删除',
        populationUpdated: '人群已更新',
        studyInfoUpdated: '研究元数据已更新',
        templateAdded: '模板已添加',
        templateApplied: '模板已应用',
        templateDeleted: '模板已删除',
        validationError: '验证错误'
      },
      // Populations
      populations: {
        add: '添加',
        dataset: '参考数据集',
        default: '默认',
        delete: '删除',
        description: '描述',
        edit: '编辑',
        filterExpression: '筛选表达式',
        name: '人群名称',
        setAsDefault: '设为默认',
        title: '人群定义',
        version: '版本'
      },
      // Study metadata
      studyMetadata: {
        compound: '研究化合物',
        description: '研究描述',
        diseaseArea: '疾病领域',
        phase: '研究阶段',
        reset: '重置',
        save: '保存',
        studyId: '研究 ID',
        studyTitle: '研究标题',
        therapeuticArea: '治疗领域',
        title: '研究元数据',
        version: '版本'
      },
      // Table
      table: {
        addPTRow: '添加 PT 行',
        addRow: '添加行',
        addSOCRow: '添加 SOC 行',
        collapse: '收起',
        collapseAll: '收起全部',
        deleteRow: '删除行',
        duplicateRow: '复制行',
        expand: '展开',
        expandAll: '展开全部',
        indent: '缩进',
        label: '标签',
        level: '层级',
        moveDown: '下移',
        moveUp: '上移',
        outdent: '取消缩进',
        row: '行',
        rows: '行',
        statistics: '统计量',
        title: '表格',
        variable: '变量'
      },
      // Templates
      templates: {
        allTypes: '所有类型',
        applyTemplate: '应用模板',
        browseTemplates: '浏览模板',
        byCategory: '按分类',
        byType: '按类型',
        createdAt: '创建时间',
        figures: '图形',
        listings: '列表',
        searchTemplates: '搜索模板...',
        selectedTemplate: '已选模板',
        selectTemplate: '选择模板',
        tables: '表格',
        templateCategory: '模板分类',
        templateDescription: '描述',
        templateName: '模板名称',
        templateType: '模板类型',
        title: '模板库'
      },
      title: 'TFL 设计器'
    },
    tflTemplateLibrary: {},
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
        SuperAdmin: {
          description: '拥有全部系统权限，包括用户管理',
          label: '超级管理员'
        },
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
