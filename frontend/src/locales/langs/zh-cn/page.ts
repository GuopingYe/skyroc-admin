const page: App.I18n.Schema['translation']['page'] = {
  about: {
    devDep: '开发依赖',
    introduction: `SkyrocAdmin 是一个优雅且功能强大的后台管理模板，基于最新的前端技术栈，包括 React19.0, Vite6, TypeScript,ReactRouter7,Redux/toolkit 和 UnoCSS。它内置了丰富的主题配置和组件，代码规范严谨，实现了自动化的文件路由系统。此外，它还采用了基于 ApiFox 的在线Mock数据方案。SkyrocAdmin 为您提供了一站式的后台管理解决方案，无需额外配置，开箱即用。同样是一个快速学习前沿技术的最佳实践。`,
    prdDep: '生产依赖',
    projectInfo: {
      githubLink: 'Github 地址',
      latestBuildTime: '最新构建时间',
      previewLink: '预览地址',
      title: '项目信息',
      version: '版本'
    },
    title: '关于'
  },
  function: {
    multiTab: {
      backTab: '返回 function_tab',
      routeParam: '路由参数'
    },
    request: {
      repeatedError: '重复请求错误',
      repeatedErrorMsg1: '自定义请求错误 1',
      repeatedErrorMsg2: '自定义请求错误 2',
      repeatedErrorOccurOnce: '重复请求错误只出现一次'
    },
    tab: {
      tabOperate: {
        addMultiTab: '添加多标签页',
        addMultiTabDesc1: '跳转到多标签页页面',
        addMultiTabDesc2: '跳转到多标签页页面(带有查询参数)',
        addTab: '添加标签页',
        addTabDesc: '跳转到关于页面',
        closeAboutTab: '关闭"关于"标签页',
        closeCurrentTab: '关闭当前标签页',
        closeTab: '关闭标签页',
        title: '标签页操作'
      },
      tabTitle: {
        change: '修改',
        changeTitle: '修改标题',
        reset: '重置',
        resetTitle: '重置标题',
        title: '标签页标题'
      }
    },
    toggleAuth: {
      adminOrUserVisible: '管理员和用户可见',
      adminVisible: '管理员可见',
      authHook: '权限钩子函数 `hasAuth`',
      superAdminVisible: '超级管理员可见',
      toggleAccount: '切换账号'
    }
  },
  home: {
    creativity: '创意',
    dealCount: '成交量',
    downloadCount: '下载量',
    entertainment: '娱乐',
    greeting: '早安，{{userName}}, 今天又是充满活力的一天!',
    message: '消息',
    projectCount: '项目数',
    projectNews: {
      desc1: 'Skyroc 在2021年5月28日创建了开源项目 skyroc-admin!',
      desc2: 'Yanbowe 向 skyroc-admin 提交了一个bug，多标签栏不会自适应。',
      desc3: 'Skyroc 准备为 skyroc-admin 的发布做充分的准备工作!',
      desc4: 'Skyroc 正在忙于为skyroc-admin写项目说明文档！',
      desc5: 'Skyroc 刚才把工作台页面随便写了一些，凑合能看了！',
      moreNews: '更多动态',
      title: '项目动态'
    },
    registerCount: '注册量',
    rest: '休息',
    schedule: '作息安排',
    study: '学习',
    todo: '待办',
    turnover: '成交额',
    visitCount: '访问量',
    weatherDesc: '今日多云转晴，20℃ - 25℃!',
    work: '工作'
  },
  login: {
    bindWeChat: {
      title: '绑定微信'
    },
    codeLogin: {
      getCode: '获取验证码',
      imageCodePlaceholder: '请输入图片验证码',
      reGetCode: '{{time}}秒后重新获取',
      sendCodeSuccess: '验证码发送成功',
      title: '验证码登录'
    },
    common: {
      back: '返回',
      codeLogin: '验证码登录',
      codePlaceholder: '请输入验证码',
      confirm: '确定',
      confirmPasswordPlaceholder: '请再次输入密码',
      loginOrRegister: '登录 / 注册',
      loginSuccess: '登录成功',
      passwordPlaceholder: '请输入密码',
      phonePlaceholder: '请输入手机号',
      userNamePlaceholder: '请输入用户名',
      validateSuccess: '验证成功',
      welcomeBack: '欢迎回来，{{userName}} ！'
    },
    pwdLogin: {
      admin: '管理员',
      forgetPassword: '忘记密码？',
      otherAccountLogin: '其他账号登录',
      otherLoginMode: '其他登录方式',
      register: '注册账号',
      rememberMe: '记住我',
      superAdmin: '超级管理员',
      title: '密码登录',
      user: '普通用户'
    },
    register: {
      agreement: '我已经仔细阅读并接受',
      policy: '《隐私权政策》',
      protocol: '《用户协议》',
      title: '注册账号'
    },
    resetPwd: {
      title: '重置密码'
    }
  },
  manage: {
    common: {
      status: {
        disable: '禁用',
        enable: '启用'
      }
    },
    menu: {
      activeMenu: '高亮的菜单',
      addChildMenu: '新增子菜单',
      addMenu: '新增菜单',
      button: '按钮',
      buttonCode: '按钮编码',
      buttonDesc: '按钮描述',
      constant: '常量路由',
      editMenu: '编辑菜单',
      fixedIndexInTab: '固定在页签中的序号',
      form: {
        activeMenu: '请选择高亮的菜单的路由名称',
        button: '请选择是否按钮',
        buttonCode: '请输入按钮编码',
        buttonDesc: '请输入按钮描述',
        fixedIndexInTab: '请输入固定在页签中的序号',
        fixedInTab: '请选择是否固定在页签中',
        hideInMenu: '请选择是否隐藏菜单',
        home: '请选择首页',
        href: '请输入外链',
        i18nKey: '请输入国际化key',
        icon: '请输入图标',
        keepAlive: '请选择是否缓存路由',
        layout: '请选择布局组件',
        localIcon: '请选择本地图标',
        menuName: '请输入菜单名称',
        menuStatus: '请选择菜单状态',
        menuType: '请选择菜单类型',
        multiTab: '请选择是否支持多标签',
        order: '请输入排序',
        page: '请选择页面组件',
        parent: '请选择父级菜单',
        pathParam: '请输入路径参数',
        queryKey: '请输入路由参数Key',
        queryValue: '请输入路由参数Value',
        routeName: '请输入路由名称',
        routePath: '请输入路由路径'
      },
      hideInMenu: '隐藏菜单',
      home: '首页',
      href: '外链',
      i18nKey: '国际化key',
      icon: '图标',
      iconType: {
        iconify: 'iconify图标',
        local: '本地图标'
      },
      iconTypeTitle: '图标类型',
      id: 'ID',
      keepAlive: '缓存路由',
      layout: '布局',
      localIcon: '本地图标',
      menuName: '菜单名称',
      menuStatus: '菜单状态',
      menuType: '菜单类型',
      multiTab: '支持多页签',
      order: '排序',
      page: '页面组件',
      parent: '父级菜单',
      parentId: '父级菜单ID',
      pathParam: '路径参数',
      query: '路由参数',
      routeName: '路由名称',
      routePath: '路由路径',
      title: '菜单列表',
      type: {
        directory: '目录',
        menu: '菜单'
      }
    },
    role: {
      addRole: '新增角色',
      buttonAuth: '按钮权限',
      editRole: '编辑角色',
      form: {
        roleCode: '请输入角色编码',
        roleDesc: '请输入角色描述',
        roleName: '请输入角色名称',
        roleStatus: '请选择角色状态'
      },
      menuAuth: '菜单权限',
      roleCode: '角色编码',
      roleDesc: '角色描述',
      roleName: '角色名称',
      roleStatus: '角色状态',
      title: '角色列表'
    },
    roleDetail: {
      content: '这个页面仅仅是为了展示匹配到所有多级动态路由',
      explain:
        '[...slug] 是匹配所有多级动态路由的语法 以[...any]为格式,匹配到的数据会在useRoute的params中以数组的形式存在'
    },
    user: {
      addUser: '新增用户',
      editUser: '编辑用户',
      form: {
        nickName: '请输入昵称',
        userEmail: '请输入邮箱',
        userGender: '请选择性别',
        userName: '请输入用户名',
        userPhone: '请输入手机号',
        userRole: '请选择用户角色',
        userStatus: '请选择用户状态'
      },
      gender: {
        female: '女',
        male: '男'
      },
      nickName: '昵称',
      title: '用户列表',
      userEmail: '邮箱',
      userGender: '性别',
      userName: '用户名',
      userPhone: '手机号',
      userRole: '用户角色',
      userStatus: '用户状态'
    },
    userDetail: {
      content: `loader 会让网络请求跟懒加载的文件几乎一起发出请求 然后 一边解析懒加载的文件 一边去等待 网络请求
        待到网络请求完成页面 一起显示 配合react的fiber架构 可以做到 用户如果嫌弃等待时间较长 在等待期间用户可以去
        切换不同的页面 这是react 框架和react-router数据路由器的优势 而不用非得等到 页面的显现 而不是常规的
        请求懒加载的文件 - 解析 - 请求懒加载的文件 - 挂载之后去发出网络请求 - 然后渲染页面 - 渲染完成
        还要自己加loading效果`,
      explain: '这个页面仅仅是为了展示 react-router-dom 的 loader 的强大能力，数据是随机的对不上很正常'
    }
  },
  mdr: {
    contextSelector: {
      contextReady: '上下文就绪',
      label: '工作上下文',
      selectAnalysis: '选择分析批次',
      selectAnalysisHint: '请选择分析批次',
      selectProduct: '选择产品',
      selectRequired: '请选择上下文',
      selectStudy: '选择研究项目',
      selectStudyHint: '请选择研究项目'
    },
    globalLibrary: {
      baseClassName: '基类名称',
      biomedicalConcept: '医学概念',
      // 医学概念弹窗
      biomedicalConceptMapping: '医学概念映射',
      browse: '{{standard}} 浏览',
      code: '编码',
      collectionFields: '收集字段',

      // 动态列 Schema
      cols: {
        biomedicalConcept: '医学概念',
        class: '分类',
        core: '核心性',
        crfPrompt: 'CRF 提示',
        dataType: '数据类型',
        definition: '定义',
        derivation: '派生规则',
        description: '描述',
        domain: '域',
        fieldName: '字段名',
        itemId: '项目ID',
        label: '标签',
        length: '长度',
        name: '名称',
        nciCode: 'NCI Code',
        observationClass: '观察类',
        origin: '来源',
        question: '问题',
        required: '必填',
        responseOptions: '响应选项',
        role: '角色',
        sdtmDomain: 'SDTM 域',
        sdtmMapping: 'SDTM 映射',
        sdtmVariable: 'SDTM 变量',
        synonyms: '同义词',
        term: '术语',
        type: '类型',
        variable: '泛化变量',
        variableName: '变量名',
        varName: '变量名'
      },
      conceptId: '概念ID',

      connectionError: '无法连接到后端服务，请检查服务是否在端口 9000 运行',
      core: 'Core',
      coreFilter: 'Core 过滤',
      crfPrompt: 'CRF 提示',

      datasets: '数据集',

      dataSource: '数据来源',

      dataType: '数据类型',
      definition: '定义',
      // ADaM 列
      derivation: '派生规则',
      // CDASH 列
      fieldName: '字段名',
      // QRS 列
      itemId: '项目ID',
      label: '标签',
      length: '长度',
      loadError: '加载数据失败',
      loading: '加载中...',
      // Model 溯源抽屉
      modelTraceability: 'Model 溯源',
      moreItems: '+ {{count}} 更多',
      // CT 列
      nciCode: 'NCI Code',

      noData: '暂无数据',
      noDatasets: '暂无数据集',
      noSearchResults: '未找到匹配结果',

      notFound: '未找到信息',

      origin: '来源',
      question: '问题',
      questionItems: '问题项',
      refresh: '刷新',
      required: '必填',
      responseOptions: '响应选项',
      role: '角色',

      sdtmDomain: 'SDTM 域',
      sdtmMapping: 'SDTM 映射',
      sdtmVariable: 'SDTM 变量',
      // 搜索
      searchDataset: '搜索数据集...',
      searchDomain: '搜索 Domain 或术语...',
      searchPlaceholder: '搜索...',
      searchStandard: '搜索标准名称...',

      selectSubType: '选择子类型',
      selectVersion: '选择版本',
      selectVersionHint: '请在左侧选择一个标准版本',
      selectVersionPrompt: '请选择标准版本',
      // 级联导航 - 子类型
      standardTree: '标准树',
      subTypes: {
        adamCt: 'ADaM 受控术语',
        adamIg: 'ADaM 实施指南',
        adamModel: 'ADaM 模型',
        cdashCt: 'CDASH 受控术语',
        cdashIg: 'CDASH 实施指南',
        qrsIg: 'QRS 实施指南',
        sdtmCt: 'SDTM 受控术语',
        sdtmIg: 'SDTM 实施指南',
        sdtmModel: 'SDTM 模型'
      },
      // 按钮
      syncCDISC: '同步 CDISC',
      synonyms: '同义词',

      term: '术语',
      termList: '术语列表',
      // 标题
      title: '全局标准库',
      // 分页
      total: '共 {{count}} 条',
      totalVariables: '共 {{count}} 个变量',

      traceabilityDesc: '此变量派生自 SDTM Model 的泛化基类变量。',
      traceabilityTip: '点击查看 Model 溯源',
      type: '类型',
      variableList: '变量列表',
      // SDTM 列
      variableName: '变量名',

      variables: '变量列表',
      viewVariables: '查看变量'
    },
    mapping: {
      // 按钮
      addMapping: '+ 添加目标映射',
      aiComingSoon: 'AI 功能即将上线',
      analysis: '分析',

      cancel: '取消',
      changeContext: '切换 Analysis',
      changeContextHint: '切换作用域功能开发中...',
      clickToStart: '点击源字段列表中的任意项，开始配置 SDTM 映射规则',
      compound: '化合物',
      delete: '删除',
      // 多模态推导逻辑
      derivation: '推导逻辑',
      derivationLogic: '派生逻辑',

      // 编辑区域
      editing: '正在编辑',
      enterLogic: '输入 SAS 派生逻辑代码...',
      enterVariable: '如: VSORRES, AGE, SEX',
      filterAll: '全部',

      filterByForm: '按来源表单筛选',
      filterDraft: '草稿',
      filterInProduction: '生产中',
      filterMapped: '已映射',

      filterQCing: 'QC中',
      filterUnmapped: '未映射',
      generateCode: '生成代码',
      import: '导入',
      // 导入 SDR
      importSDR: '导入 SDR',
      importSDRDesc: '点击或拖拽 SDR Excel 文件到此区域进行解析',
      importSDRError: '文件解析失败，请检查文件格式。',
      importSDRHint: '支持 .xlsx, .xls 格式，文件大小不超过 10MB',
      importSDRParsing: '正在解析文件...',
      importSDRSuccess: 'SDR 解析成功！共导入 {{count}} 个源字段。',

      importSDRTitle: '导入 SDR 数据',
      logicExample: '示例:\nIF VSTESTCD = "HR" THEN DO;\n  VSORRES = HR_VAL;\n  VSORRESU = "beats/min";\nEND;',
      mappedCount: '已映射 {{count}} 个',
      // 映射卡片
      mappingCard: '映射 #{{index}}',

      mappingCount: '映射数量',

      naturalLanguage: '自然语言 (AI)',
      nlPlaceholder: '使用自然语言描述推导规则，AI 将自动生成代码...',
      noFieldsFound: '未找到匹配的字段',

      noMapping: '未映射',
      oneToNHint: '支持一个源字段映射到多个目标域（1:N 关系）',

      programmer: '编程人员',
      rCode: 'R 代码',
      rPlaceholder: '输入 R/dplyr 派生逻辑代码...',
      sasCode: 'SAS 代码',
      sasPlaceholder: '输入 SAS 派生逻辑代码...',
      sasSyntax: '支持 SAS 语法，使用等宽字体显示代码',
      save: '保存映射',
      // 消息提示
      saveSuccess: '映射保存成功！',
      // 作用域上下文
      scopeContext: '作用域上下文',
      // 筛选区域
      searchPlaceholder: '搜索字段名称、标签...',

      selectDomain: '选择 SDTM 域',
      // 空状态
      selectFieldPrompt: '请在左侧选择一个字段进行映射',
      showCount: '显示 {{count}} / {{total}} 个字段',
      // 列表区域
      sourceFields: '源字段',
      sourceForm: '来源表单',
      // 状态
      status: {
        Draft: '草稿',
        In_Production: '生产中',
        Locked: '已锁定',
        QCing: 'QC中'
      },
      study: '研究',

      submitQC: '提交 QC',
      submittedToQC: '已流转至 QC 状态',
      subtitle: 'SDR → SDTM 映射工作台',
      supportOneToN: '支持 1:N 映射关系',
      ta: '治疗领域',
      targetDomain: '目标域',
      targetVariable: '目标变量',
      title: '映射工作室',
      upload: '上传文件'
    },
    pipelineManagement: {
      analysisConfig: {
        archivedHint: '该分析已归档，无法访问',
        description: '描述',
        goToMapping: '进入 Mapping Studio',
        lockedAt: '锁定时间',
        lockedBy: '锁定人',
        title: 'Analysis 配置'
      },
      archive: '归档',
      archiveConfirm: '确定要归档该节点吗？归档后节点将从活跃视图中隐藏。',
      archiveSuccess: '节点已归档',
      cancelEdit: '取消编辑',
      children: {
        title: '子节点列表'
      },
      cols: {
        action: '操作',
        createdAt: '创建时间',
        id: '编号',
        nodeType: '类型',
        status: '状态',
        title: '名称',
        updatedAt: '更新时间'
      },
      context: {
        scope: '当前作用域',
        selectAnalysisForJobs: '请在上方的上下文选择器中选择具体的分析批次以查看执行作业。',
        selectAnalysisHint: '请选择分析批次',
        selectHint: '使用上方的上下文选择器选择 Product、Study 和 Analysis',
        selectRequired: '请选择一个 Study 以查看项目时间线',
        selectStudyForConfig: '请在上方的上下文选择器中选择一个研究项目以查看其配置。',
        selectStudyForTimeline: '请在上方的上下文选择器中选择一个研究项目以查看里程碑。',
        selectStudyHint: '请选择研究项目'
      },
      createChild: '新建 {{type}}',
      createModal: {
        title: '新建 {{type}}',
        titlePlaceholder: '请输入节点名称'
      },
      createSuccess: '创建成功',
      createTA: '新建顶级 TA',
      edit: '编辑',
      jobs: {
        cols: {
          duration: '耗时',
          name: '作业名称',
          startTime: '开始时间',
          status: '状态',
          triggeredBy: '触发者',
          type: '类型'
        },
        status: {
          Cancelled: '已取消',
          Failed: '失败',
          Running: '运行中',
          Success: '成功'
        },
        title: '执行作业'
      },
      lifecycleStatus: '生命周期状态',
      lockedWarning: '该节点已锁定，无法编辑',
      milestone: {
        add: '添加里程碑',
        cols: {
          action: '操作',
          actualDate: '实际日期',
          assignee: '负责人',
          comment: '备注',
          level: '层级',
          name: '里程碑名称',
          plannedDate: '计划日期',
          presetType: '预设类型',
          status: '状态'
        },
        createModal: {
          title: '新建里程碑'
        },
        delete: '删除',
        deleteConfirm: '确定要删除此里程碑吗？',
        edit: '编辑',
        editModal: {
          title: '编辑里程碑'
        },
        noMilestones: '暂无里程碑，点击"添加里程碑"创建',
        showingAnalysisLevel: '正在显示所选分析批次的里程碑。',
        showingStudyLevel: '正在显示研究级别里程碑（FPI、LPI）。选择分析批次可查看更多里程碑。',
        stats: {
          atRisk: '有风险',
          completed: '已完成',
          delayed: '已延期',
          onTrack: '进行中',
          pending: '待处理',
          total: '总计'
        },
        status: {
          AtRisk: '有风险',
          Completed: '已完成',
          Delayed: '已延期',
          OnTrack: '进行中',
          Pending: '待处理'
        },
        tableTitle: '里程碑跟踪表',
        timelineTitle: '项目时间线',
        totalCount: '共 {{count}} 个里程碑'
      },
      save: '保存',
      saveSuccess: '保存成功',
      selectNodeHint: '请在左侧选择节点进行管理',
      studyConfig: {
        basicInfo: '基本信息',
        cdiscStandards: 'CDISC 标准锁定',
        dictionaries: '医学字典锁定',
        phase: '研究阶段',
        protocolTitle: '方案标题',
        title: 'Study 配置'
      },
      tabs: {
        jobs: '执行作业',
        portfolio: '组合管理',
        studyConfig: '研究配置',
        timelines: '项目时间线'
      },
      tree: {
        title: '管线树'
      },
      view: '查看'
    },
    programmingTracker: {
      addTask: '新建任务',
      category: {
        adam: 'ADaM',
        other: '其他',
        sdtm: 'SDTM',
        tfl: 'TFL'
      },
      cols: {
        action: '操作',
        analysisPopulation: '分析人群',
        dataset: '数据集',
        datasetLabel: '数据集标签',
        description: '描述',
        domain: '域',
        label: '标签',
        outputId: '输出 ID',
        population: '人群',
        primaryProgrammer: 'SAS 程序员',
        programmers: '编程人员',
        qcProgrammer: 'QC 程序员',
        qcStatus: 'QC 状态',
        sdrSource: 'SDR 来源',
        status: '状态',
        taskCategory: '分类',
        taskName: '任务名称',
        title: '标题',
        type: '类型'
      },
      context: {
        contextReady: '上下文就绪',
        selectAnalysis: '选择分析批次',
        selectHint: '请选择产品、研究项目和分析批次以查看任务',
        selectionLabel: '全局上下文',
        selectProduct: '选择产品',
        selectRequired: '请选择上下文',
        selectStudy: '选择研究项目'
      },
      createModal: {
        success: '任务创建成功',
        title: '新建任务'
      },
      delete: '删除',
      deleteConfirm: '确定要删除此任务吗？',
      deleteSuccess: '任务删除成功',
      edit: '编辑',
      editModal: {
        success: '任务更新成功',
        title: '编辑任务'
      },
      form: {
        datasetLabelPlaceholder: '请输入数据集标签',
        datasetPlaceholder: '请选择数据集',
        descriptionPlaceholder: '请输入任务描述',
        domainPlaceholder: '请选择域',
        labelPlaceholder: '请输入数据集标签',
        outputIdPlaceholder: '例如: T-14.1.1',
        populationPlaceholder: '请选择人群',
        primaryProgrammerPlaceholder: '请选择 SAS 程序员',
        qcProgrammerPlaceholder: '请选择 QC 程序员',
        sdrSourcePlaceholder: '请输入 SDR 来源表单',
        statusPlaceholder: '请选择状态',
        taskCategoryPlaceholder: '请选择分类',
        taskNamePlaceholder: '请输入任务名称',
        titlePlaceholder: '请输入输出标题',
        typePlaceholder: '请选择类型',
        validateMsg: {
          datasetLabelRequired: '请输入数据集标签',
          datasetRequired: '请选择数据集',
          descriptionRequired: '请输入描述',
          domainRequired: '请选择域',
          labelRequired: '请输入标签',
          outputIdRequired: '请输入输出 ID',
          populationRequired: '请选择人群',
          primaryProgrammerRequired: '请选择 SAS 程序员',
          qcProgrammerRequired: '请选择 QC 程序员',
          sdrSourceRequired: '请输入 SDR 来源',
          statusRequired: '请选择状态',
          taskCategoryRequired: '请选择分类',
          taskNameRequired: '请输入任务名称',
          titleRequired: '请输入标题',
          typeRequired: '请选择类型'
        }
      },
      popconfirm: {
        cancel: '取消',
        confirm: '确定'
      },
      recent: {
        clear: '清空',
        daysAgo: '{{count}} 天前',
        hoursAgo: '{{count}} 小时前',
        justNow: '刚刚',
        minutesAgo: '{{count}} 分钟前',
        title: '最近访问'
      },
      stats: {
        completed: '已完成',
        inProgress: '进行中',
        inQC: 'QC 中',
        notStarted: '未开始',
        openIssues: '开放问题',
        signedOff: '已签收',
        total: '总任务数'
      },
      title: '编程任务跟踪器',
      totalTasks: '共 {{count}} 个任务'
    },
    studySpec: {
      addSuccess: '变量添加成功',
      addVariable: '新增变量',
      class: '分类',
      cols: {
        action: '操作',
        codelist: '受控术语',
        comment: '备注',
        core: '核心性',
        dataType: '数据类型',
        implementationNotes: '实施说明',
        label: '标签',
        length: '长度',
        origin: '来源',
        role: '角色',
        sourceDerivation: '来源/推导',
        sourceField: '来源字段',
        variableName: '变量名'
      },
      confirmDelete: '确定要删除此变量吗？',
      datasets: '数据集',
      delete: '删除',
      deleteSuccess: '变量删除成功',
      edit: '编辑',
      editDrawer: {
        aiPrompt: 'AI Prompt',
        cancel: '取消',
        commentPlaceholder: '请输入备注',
        derivationPlaceholder: '请输入推导逻辑（支持 SAS/R 语法）',
        implementationNotesPlaceholder: '描述推导规则，用于 AI 代码生成...',
        save: '保存',
        saveSuccess: '变量保存成功！',
        sourceField: '来源字段',
        sourceFieldPlaceholder: '请输入来源字段名',
        title: '编辑变量'
      },
      form: {
        validateMsg: {
          coreRequired: '请选择核心性',
          dataTypeRequired: '请选择数据类型',
          labelRequired: '请输入变量标签',
          lengthRequired: '请输入长度',
          roleRequired: '请输入角色',
          variableNameRequired: '请输入变量名'
        }
      },
      keys: '主键',
      scopeContext: {
        analysis: '分析',
        compound: '化合物',
        currentScope: '当前作用域',
        study: '项目',
        switchAnalysis: '切换 Analysis',
        ta: '治疗领域'
      },
      searchDataset: '搜索数据集...',
      sortSuccess: '变量顺序已更新',
      structure: '结构',
      title: '项目规范 (Study Spec)',
      totalRows: '共 {{count}} 条',
      totalVars: '共 {{count}} 个变量',
      traceDrawer: {
        hint: '展示 CDISC Global Library 中的官方变量定义',
        title: 'Global Library 定义'
      },
      traceGlobalLibrary: '溯源 Global Library',
      variables: '变量列表'
    },
    tflBuilder: {
      canvas: {
        addColumn: '添加列',
        addFootnote: '添加脚注',
        addRow: '添加行',
        addTitle: '添加标题',
        dragHint: '拖拽左侧组件到此处添加行',
        emptyHint: '请先创建 TFL Shell',
        parameter: '参数'
      },
      context: {
        selectAnalysisForTfl: '选择分析批次后开始设计',
        selectAnalysisHint: '请在上方选择 Analysis 以开始设计 TFL Shell'
      },
      leftPanel: {
        datasets: '数据集变量',
        searchStatistics: '搜索统计组件...',
        searchVariables: '搜索变量...',
        statisticHint: '拖拽组件到画布添加统计行',
        statistics: '统计组件'
      },
      messages: {
        exported: '导出成功',
        newShellCreated: '已创建新 Shell',
        saved: '保存成功',
        statisticAdded: '已添加统计: {{name}}',
        variableAdded: '已添加变量: {{name}}'
      },
      props: {
        alignment: '对齐方式',
        columnCode: '筛选条件',
        columnColor: '标识颜色',
        columnName: '列名称',
        deleteColumn: '删除列',
        deleteFootnote: '删除脚注',
        deleteRow: '删除行',
        deleteTitle: '删除标题',
        footnoteText: '脚注文本',
        indentLevel: '缩进级别',
        label: '标签',
        name: '名称',
        rowType: '行类型',
        status: '状态',
        tflId: 'TFL ID',
        titleText: '标题文本',
        type: '类型'
      },
      rightPanel: {
        cell: '单元格',
        column: '治疗列',
        footnote: '脚注',
        row: '数据行',
        selectHint: '点击画布中的元素查看属性',
        shell: 'TFL Shell',
        title: '标题'
      },
      toolbar: {
        editMode: '编辑模式',
        export: '导出 JSON',
        newShell: '新建 Shell',
        previewMode: '预览模式',
        redo: '重做',
        save: '保存',
        undo: '撤销',
        zoomIn: '放大',
        zoomOut: '缩小'
      }
    }
  }
};

export default page;
