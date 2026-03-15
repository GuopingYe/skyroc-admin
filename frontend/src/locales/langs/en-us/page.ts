const page: App.I18n.Schema['translation']['page'] = {
  about: {
    devDep: 'Development Dependency',
    introduction: `SkyrocAdmin is an elegant and powerful admin template, based on the latest front-end technology stack, including React19.0, Vite6, TypeScript, ReactRouter7,Redux/toolkitand UnoCSS. It has built-in rich theme configuration and components, strict code specifications, and an automated file routing system. In addition, it also uses the online mock data solution based on ApiFox. SkyrocAdmin provides you with a one-stop admin solution, no additional configuration, and out of the box. It is also a best practice for learning cutting-edge technologies quickly.`,
    prdDep: 'Production Dependency',
    projectInfo: {
      githubLink: 'Github Link',
      latestBuildTime: 'Latest Build Time',
      previewLink: 'Preview Link',
      title: 'Project Info',
      version: 'Version'
    },
    title: 'About'
  },
  function: {
    multiTab: {
      backTab: 'Back function_tab',
      routeParam: 'Route Param'
    },
    request: {
      repeatedError: 'Repeated Request Error',
      repeatedErrorMsg1: 'Custom Request Error 1',
      repeatedErrorMsg2: 'Custom Request Error 2',
      repeatedErrorOccurOnce: 'Repeated Request Error Occurs Once'
    },
    tab: {
      tabOperate: {
        addMultiTab: 'Add Multi Tab',
        addMultiTabDesc1: 'To MultiTab page',
        addMultiTabDesc2: 'To MultiTab page(with query params)',
        addTab: 'Add Tab',
        addTabDesc: 'To about page',
        closeAboutTab: 'Close "About" Tab',
        closeCurrentTab: 'Close Current Tab',
        closeTab: 'Close Tab',
        title: 'Tab Operation'
      },
      tabTitle: {
        change: 'Change',
        changeTitle: 'Change Title',
        reset: 'Reset',
        resetTitle: 'Reset Title',
        title: 'Tab Title'
      }
    },
    toggleAuth: {
      adminOrUserVisible: 'Admin and User Visible',
      adminVisible: 'Admin Visible',
      authHook: 'Auth Hook Function `hasAuth`',
      superAdminVisible: 'Super Admin Visible',
      toggleAccount: 'Toggle Account'
    }
  },
  home: {
    creativity: 'Creativity',
    dealCount: 'Deal Count',
    downloadCount: 'Download Count',
    entertainment: 'Entertainment',
    greeting: 'Good morning, {{userName}}, today is another day full of vitality!',
    message: 'Message',
    projectCount: 'Project Count',
    projectNews: {
      desc1: 'Skyroc created the open source project skyroc-admin on May 28, 2021!',
      desc2: 'Yanbowe submitted a bug to skyroc-admin, the multi-tab bar will not adapt.',
      desc3: 'Skyroc is ready to do sufficient preparation for the release of skyroc-admin!',
      desc4: 'Skyroc is busy writing project documentation for skyroc-admin!',
      desc5: 'Skyroc just wrote some of the workbench pages casually, and it was enough to see!',
      moreNews: 'More News',
      title: 'Project News'
    },
    registerCount: 'Register Count',
    rest: 'Rest',
    schedule: 'Work and rest Schedule',
    study: 'Study',
    todo: 'Todo',
    turnover: 'Turnover',
    visitCount: 'Visit Count',
    weatherDesc: 'Today is cloudy to clear, 20℃ - 25℃!',
    work: 'Work'
  },
  login: {
    bindWeChat: {
      title: 'Bind WeChat'
    },
    codeLogin: {
      getCode: 'Get verification code',
      imageCodePlaceholder: 'Please enter image verification code',
      reGetCode: 'Reacquire after {{time}}s',
      sendCodeSuccess: 'Verification code sent successfully',
      title: 'Verification Code Login'
    },
    common: {
      back: 'Back',
      codeLogin: 'Verification code login',
      codePlaceholder: 'Please enter verification code',
      confirm: 'Confirm',
      confirmPasswordPlaceholder: 'Please enter password again',
      loginOrRegister: 'Login / Register',
      loginSuccess: 'Login successfully',
      passwordPlaceholder: 'Please enter password',
      phonePlaceholder: 'Please enter phone number',
      userNamePlaceholder: 'Please enter user name',
      validateSuccess: 'Verification passed',
      welcomeBack: 'Welcome back, {{userName}} !'
    },
    pwdLogin: {
      admin: 'Admin',
      forgetPassword: 'Forget password?',
      otherAccountLogin: 'Other Account Login',
      otherLoginMode: 'Other Login Mode',
      register: 'Register',
      rememberMe: 'Remember me',
      superAdmin: 'Super Admin',
      title: 'Password Login',
      user: 'User'
    },
    register: {
      agreement: 'I have read and agree to',
      policy: '《Privacy Policy》',
      protocol: '《User Agreement》',
      title: 'Register'
    },
    resetPwd: {
      title: 'Reset Password'
    }
  },
  manage: {
    common: {
      status: {
        disable: 'Disable',
        enable: 'Enable'
      }
    },
    menu: {
      activeMenu: 'Active Menu',
      addChildMenu: 'Add Child Menu',
      addMenu: 'Add Menu',
      button: 'Button',
      buttonCode: 'Button Code',
      buttonDesc: 'Button Desc',
      constant: 'Constant',
      editMenu: 'Edit Menu',
      fixedIndexInTab: 'Fixed Index In Tab',
      form: {
        activeMenu: 'Please select route name of the highlighted menu',
        button: 'Please select whether it is a button',
        buttonCode: 'Please enter button code',
        buttonDesc: 'Please enter button description',
        fixedIndexInTab: 'Please enter the index fixed in the tab',
        fixedInTab: 'Please select whether to fix in the tab',
        hideInMenu: 'Please select whether to hide menu',
        home: 'Please select home',
        href: 'Please enter href',
        i18nKey: 'Please enter i18n key',
        icon: 'Please enter iconify name',
        keepAlive: 'Please select whether to cache route',
        layout: 'Please select layout component',
        localIcon: 'Please enter local icon name',
        menuName: 'Please enter menu name',
        menuStatus: 'Please select menu status',
        menuType: 'Please select menu type',
        multiTab: 'Please select whether to support multiple tabs',
        order: 'Please enter order',
        page: 'Please select page component',
        parent: 'Please select whether to parent menu',
        pathParam: 'Please enter path param',
        queryKey: 'Please enter route parameter Key',
        queryValue: 'Please enter route parameter Value',
        routeName: 'Please enter route name',
        routePath: 'Please enter route path'
      },
      hideInMenu: 'Hide In Menu',
      home: 'Home',
      href: 'Href',
      i18nKey: 'I18n Key',
      icon: 'Icon',
      iconType: {
        iconify: 'Iconify Icon',
        local: 'Local Icon'
      },
      iconTypeTitle: 'Icon Type',
      id: 'ID',
      keepAlive: 'Keep Alive',
      layout: 'Layout Component',
      localIcon: 'Local Icon',
      menuName: 'Menu Name',
      menuStatus: 'Menu Status',
      menuType: 'Menu Type',
      multiTab: 'Multi Tab',
      order: 'Order',
      page: 'Page Component',
      parent: 'Parent Menu',
      parentId: 'Parent ID',
      pathParam: 'Path Param',
      query: 'Query Params',
      routeName: 'Route Name',
      routePath: 'Route Path',
      title: 'Menu List',
      type: {
        directory: 'Directory',
        menu: 'Menu'
      }
    },
    role: {
      addRole: 'Add Role',
      buttonAuth: 'Button Auth',
      editRole: 'Edit Role',
      form: {
        roleCode: 'Please enter role code',
        roleDesc: 'Please enter role description',
        roleName: 'Please enter role name',
        roleStatus: 'Please select role status'
      },
      menuAuth: 'Menu Auth',
      roleCode: 'Role Code',
      roleDesc: 'Role Description',
      roleName: 'Role Name',
      roleStatus: 'Role Status',
      title: 'Role List'
    },
    roleDetail: {
      content: 'This page is solely for displaying all matched multi-level dynamic routes.',
      explain:
        '[...slug] is the syntax for matching all multi-level dynamic routes. The data is random and may not match.'
    },
    user: {
      addUser: 'Add User',
      editUser: 'Edit User',
      form: {
        nickName: 'Please enter nick name',
        userEmail: 'Please enter email',
        userGender: 'Please select gender',
        userName: 'Please enter user name',
        userPhone: 'Please enter phone number',
        userRole: 'Please select user role',
        userStatus: 'Please select user status'
      },
      gender: {
        female: 'Female',
        male: 'Male'
      },
      nickName: 'Nick Name',
      title: 'User List',
      userEmail: 'Email',
      userGender: 'Gender',
      userName: 'User Name',
      userPhone: 'Phone Number',
      userRole: 'User Role',
      userStatus: 'User Status'
    },
    userDetail: {
      content: `The loader allows network requests and lazy-loaded files to be triggered almost simultaneously, enabling the lazy-loaded files to be parsed while waiting for the network request to complete. Once the network request finishes, the page is displayed all at once. Leveraging React's Fiber architecture, if users find the waiting time too long, they can switch to different pages during the wait. This is an advantage of the React framework and React Router's data loader, as it avoids the conventional sequence of: request lazy-loaded file -> parse -> mount -> send network request -> render page -> display, and eliminates the need for manually adding a loading effect.`,
      explain: `This page is solely for demonstrating the powerful capabilities of react-router-dom's loader. The data is random and may not match.`
    }
  },
  mdr: {
    contextSelector: {
      contextReady: 'Context Ready',
      label: 'Work Context',
      selectAnalysis: 'Select Analysis',
      selectAnalysisHint: 'Select an Analysis',
      selectProduct: 'Select Product',
      selectRequired: 'Please select context',
      selectStudy: 'Select Study',
      selectStudyHint: 'Select a Study'
    },
    globalLibrary: {
      baseClassName: 'Base Class Name',
      biomedicalConcept: 'Biomedical Concept',
      // Biomedical Concept Modal
      biomedicalConceptMapping: 'Biomedical Concept Mapping',
      browse: '{{standard}} Browse',
      code: 'Code',
      collectionFields: 'Collection Fields',

      // Dynamic Column Schema
      cols: {
        biomedicalConcept: 'Biomedical Concept',
        class: 'Class',
        core: 'Core',
        crfPrompt: 'CRF Prompt',
        dataType: 'Data Type',
        definition: 'Definition',
        derivation: 'Derivation',
        description: 'Description',
        domain: 'Domain',
        fieldName: 'Field Name',
        itemId: 'Item ID',
        label: 'Label',
        length: 'Length',
        name: 'Name',
        nciCode: 'NCI Code',
        observationClass: 'Observation Class',
        origin: 'Origin',
        question: 'Question',
        required: 'Required',
        responseOptions: 'Response Options',
        role: 'Role',
        sdtmDomain: 'SDTM Domain',
        sdtmMapping: 'SDTM Mapping',
        sdtmVariable: 'SDTM Variable',
        synonyms: 'Synonyms',
        term: 'Term',
        type: 'Type',
        variable: 'Generic Variable',
        variableName: 'Variable Name',
        varName: 'Variable Name'
      },
      conceptId: 'Concept ID',

      connectionError: 'Unable to connect to backend. Please check if the service is running on port 9000',
      core: 'Core',
      coreFilter: 'Core Filter',
      crfPrompt: 'CRF Prompt',

      datasets: 'Datasets',

      dataSource: 'Data Source',

      dataType: 'Data Type',
      definition: 'Definition',
      // ADaM Columns
      derivation: 'Derivation',
      // CDASH Columns
      fieldName: 'Field Name',
      // QRS Columns
      itemId: 'Item ID',
      label: 'Label',
      length: 'Length',
      loadError: 'Failed to load data',
      loading: 'Loading...',
      // Model Traceability Drawer
      modelTraceability: 'Model Traceability',
      moreItems: '+ {{count}} more',
      // CT Columns
      nciCode: 'NCI Code',

      noData: 'No data',
      noDatasets: 'No datasets',
      noSearchResults: 'No matching results',

      notFound: 'Information not found',

      origin: 'Origin',
      question: 'Question',
      questionItems: 'Question Items',
      refresh: 'Refresh',
      required: 'Required',
      responseOptions: 'Response Options',
      role: 'Role',

      sdtmDomain: 'SDTM Domain',
      sdtmMapping: 'SDTM Mapping',
      sdtmVariable: 'SDTM Variable',
      // Search
      searchDataset: 'Search dataset...',
      searchDomain: 'Search Domain or term...',
      searchPlaceholder: 'Search...',
      searchStandard: 'Search standard name...',

      selectSubType: 'Select sub-type',
      selectVersion: 'Select version',
      selectVersionHint: 'Please select a standard version from the left panel',
      selectVersionPrompt: 'Please select a version',
      standardTree: 'Standard Tree',
      // Cascade Navigation - Sub Types
      subTypes: {
        adamCt: 'ADaM Controlled Terminology',
        adamIg: 'ADaM Implementation Guide',
        adamModel: 'ADaM Model',
        cdashCt: 'CDASH Controlled Terminology',
        cdashIg: 'CDASH Implementation Guide',
        qrsIg: 'QRS Implementation Guide',
        sdtmCt: 'SDTM Controlled Terminology',
        sdtmIg: 'SDTM Implementation Guide',
        sdtmModel: 'SDTM Model'
      },
      // Buttons
      syncCDISC: 'Sync CDISC',
      synonyms: 'Synonyms',

      term: 'Term',
      termList: 'Term List',
      // Titles
      title: 'Global Library',
      // Pagination
      total: '{{count}} items total',
      totalVariables: '{{count}} variables total',

      traceabilityDesc: 'This variable derives from the SDTM Model generic base variable.',
      traceabilityTip: 'Click to view Model traceability',
      type: 'Type',
      variableList: 'Variable List',
      // SDTM Columns
      variableName: 'Variable Name',

      variables: 'Variables',
      viewVariables: 'View Variables'
    },
    mapping: {
      // Buttons
      addMapping: '+ Add Target Mapping',
      aiComingSoon: 'AI Coming Soon',
      analysis: 'Analysis',

      cancel: 'Cancel',
      changeContext: 'Change Context',
      changeContextHint: 'Change context feature is under development...',
      clickToStart: 'Click any item in the source field list to start configuring SDTM mapping rules',
      compound: 'Compound',
      delete: 'Delete',
      // Multi-modal Derivation
      derivation: 'Derivation Logic',
      derivationLogic: 'Derivation Logic',

      // Editor area
      editing: 'Editing',
      enterLogic: 'Enter SAS derivation logic...',
      enterVariable: 'e.g., VSORRES, AGE, SEX',
      filterAll: 'All',

      filterByForm: 'Filter by source form',
      filterDraft: 'Draft',
      filterInProduction: 'In Production',
      filterMapped: 'Mapped',

      filterQCing: 'QCing',
      filterUnmapped: 'Unmapped',
      generateCode: 'Generate Code',
      import: 'Import',
      // Import SDR
      importSDR: 'Import SDR',
      importSDRDesc: 'Click or drag SDR Excel file to this area for parsing',
      importSDRError: 'File parsing failed, please check file format.',
      importSDRHint: 'Supports .xlsx, .xls formats, max file size 10MB',
      importSDRParsing: 'Parsing file...',
      importSDRSuccess: 'SDR parsed successfully! Imported {{count}} source fields.',

      importSDRTitle: 'Import SDR Data',
      logicExample: 'Example:\nIF VSTESTCD = "HR" THEN DO;\n  VSORRES = HR_VAL;\n  VSORRESU = "beats/min";\nEND;',
      mappedCount: '{{count}} mapped',
      // Mapping card
      mappingCard: 'Mapping #{{index}}',

      mappingCount: 'Mapping Count',

      naturalLanguage: 'Natural Language (AI)',
      nlPlaceholder: 'Describe derivation rules in natural language, AI will generate code...',
      noFieldsFound: 'No matching fields found',

      noMapping: 'Unmapped',
      oneToNHint: 'One source field can be mapped to multiple target domains (1:N relationship)',

      programmer: 'Programmer',
      rCode: 'R Code',
      rPlaceholder: 'Enter R/dplyr derivation logic...',
      sasCode: 'SAS Code',
      sasPlaceholder: 'Enter SAS derivation logic...',
      sasSyntax: 'SAS syntax supported, monospace font for code',
      save: 'Save Mapping',
      // Messages
      saveSuccess: 'Mapping saved successfully!',
      // Scope Context
      scopeContext: 'Scope Context',
      // Filter area
      searchPlaceholder: 'Search field name, label...',

      selectDomain: 'Select SDTM Domain',
      // Empty state
      selectFieldPrompt: 'Please select a field from the left to configure mapping',
      showCount: 'Showing {{count}} / {{total}} fields',
      // List area
      sourceFields: 'Source Fields',
      sourceForm: 'Source Form',
      // Status
      status: {
        Draft: 'Draft',
        In_Production: 'In Production',
        Locked: 'Locked',
        QCing: 'QCing'
      },
      study: 'Study',

      submitQC: 'Submit for QC',
      submittedToQC: 'Submitted to QC status',
      subtitle: 'SDR → SDTM Mapping Workbench',
      supportOneToN: 'Supports 1:N mapping relationship',
      ta: 'Therapeutic Area',
      targetDomain: 'Target Domain',
      targetVariable: 'Target Variable',
      title: 'Mapping Studio',
      upload: 'Upload File'
    },
    pipelineManagement: {
      analysisConfig: {
        archivedHint: 'This analysis is archived and cannot be accessed',
        description: 'Description',
        goToMapping: 'Go to Mapping Studio',
        lockedAt: 'Locked At',
        lockedBy: 'Locked By',
        title: 'Analysis Configuration'
      },
      archive: 'Archive',
      archiveConfirm: 'Are you sure you want to archive this node? Archived nodes will be hidden from active views.',
      archiveSuccess: 'Node archived successfully',
      cancelEdit: 'Cancel',
      children: {
        title: 'Child Nodes'
      },
      cols: {
        action: 'Actions',
        createdAt: 'Created',
        id: 'ID',
        nodeType: 'Type',
        status: 'Status',
        title: 'Title',
        updatedAt: 'Updated'
      },
      context: {
        scope: 'Current Scope',
        selectAnalysisForJobs:
          'Select a specific Analysis batch from the context selector above to view execution jobs.',
        selectAnalysisHint: 'Please select an Analysis',
        selectHint: 'Use the context selector above to choose Product, Study and Analysis',
        selectRequired: 'Please select a Study to view project timeline',
        selectStudyForConfig: 'Select a Study from the context selector above to view its configuration.',
        selectStudyForTimeline: 'Select a Study from the context selector above to view milestones.',
        selectStudyHint: 'Please select a Study'
      },
      createChild: 'Create {{type}}',
      createModal: {
        title: 'Create {{type}}',
        titlePlaceholder: 'Enter node title'
      },
      createSuccess: 'Created successfully',
      createTA: 'Create Top-level TA',
      edit: 'Edit',
      jobs: {
        cols: {
          duration: 'Duration',
          name: 'Job Name',
          startTime: 'Start Time',
          status: 'Status',
          triggeredBy: 'Triggered By',
          type: 'Type'
        },
        status: {
          Cancelled: 'Cancelled',
          Failed: 'Failed',
          Running: 'Running',
          Success: 'Success'
        },
        title: 'Execution Jobs'
      },
      lifecycleStatus: 'Lifecycle Status',
      lockedWarning: 'This node is locked and cannot be edited',
      milestone: {
        add: 'Add Milestone',
        cols: {
          action: 'Actions',
          actualDate: 'Actual Date',
          assignee: 'Assignee',
          comment: 'Comment',
          level: 'Level',
          name: 'Milestone Name',
          plannedDate: 'Planned Date',
          presetType: 'Preset Type',
          status: 'Status'
        },
        createModal: {
          title: 'Create Milestone'
        },
        delete: 'Delete',
        deleteConfirm: 'Are you sure you want to delete this milestone?',
        edit: 'Edit',
        editModal: {
          title: 'Edit Milestone'
        },
        noMilestones: 'No milestones defined. Click "Add Milestone" to create one.',
        showingAnalysisLevel: 'Showing Analysis-level milestones for the selected batch.',
        showingStudyLevel:
          'Showing Study-level milestones (FPI, LPI). Select an Analysis to see additional milestones.',
        stats: {
          atRisk: 'At Risk',
          completed: 'Completed',
          delayed: 'Delayed',
          onTrack: 'On Track',
          pending: 'Pending',
          total: 'Total'
        },
        status: {
          AtRisk: 'At Risk',
          Completed: 'Completed',
          Delayed: 'Delayed',
          OnTrack: 'On Track',
          Pending: 'Pending'
        },
        tableTitle: 'Milestone Tracker',
        timelineTitle: 'Project Timeline',
        totalCount: '{{count}} milestones'
      },
      save: 'Save',
      saveSuccess: 'Saved successfully',
      selectNodeHint: 'Please select a node from the left tree to manage',
      studyConfig: {
        basicInfo: 'Basic Information',
        cdiscStandards: 'CDISC Standards',
        dictionaries: 'Medical Dictionaries',
        phase: 'Phase',
        protocolTitle: 'Protocol Title',
        title: 'Study Configuration'
      },
      tabs: {
        jobs: 'Execution Jobs',
        portfolio: 'Portfolio Admin',
        studyConfig: 'Study Configuration',
        timelines: 'Project Timelines'
      },
      tree: {
        title: 'Pipeline Tree'
      },
      view: 'View'
    },
    programmingTracker: {
      addTask: 'Add Task',
      category: {
        adam: 'ADaM',
        other: 'Other',
        sdtm: 'SDTM',
        tfl: 'TFL'
      },
      cols: {
        action: 'Action',
        analysisPopulation: 'Analysis Population',
        dataset: 'Dataset',
        datasetLabel: 'Dataset Label',
        description: 'Description',
        domain: 'Domain',
        label: 'Label',
        outputId: 'Output ID',
        population: 'Population',
        primaryProgrammer: 'SAS Programmer',
        programmers: 'Programmers',
        qcProgrammer: 'QC Programmer',
        qcStatus: 'QC Status',
        sdrSource: 'SDR Source',
        status: 'Status',
        taskCategory: 'Category',
        taskName: 'Task Name',
        title: 'Title',
        type: 'Type'
      },
      context: {
        contextReady: 'Context Ready',
        selectAnalysis: 'Select Analysis',
        selectHint: 'Please select Product, Study and Analysis to view tasks',
        selectionLabel: 'Global Context',
        selectProduct: 'Select Product',
        selectRequired: 'Please select context',
        selectStudy: 'Select Study'
      },
      createModal: {
        success: 'Task created successfully',
        title: 'Create Task'
      },
      delete: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this task?',
      deleteSuccess: 'Task deleted successfully',
      edit: 'Edit',
      editModal: {
        success: 'Task updated successfully',
        title: 'Edit Task'
      },
      form: {
        datasetLabelPlaceholder: 'Enter dataset label',
        datasetPlaceholder: 'Select dataset',
        descriptionPlaceholder: 'Enter task description',
        domainPlaceholder: 'Select domain',
        labelPlaceholder: 'Enter dataset label',
        outputIdPlaceholder: 'e.g., T-14.1.1',
        populationPlaceholder: 'Select population',
        primaryProgrammerPlaceholder: 'Select SAS programmer',
        qcProgrammerPlaceholder: 'Select QC programmer',
        sdrSourcePlaceholder: 'Enter SDR source form',
        statusPlaceholder: 'Select status',
        taskCategoryPlaceholder: 'Select category',
        taskNamePlaceholder: 'Enter task name',
        titlePlaceholder: 'Enter output title',
        typePlaceholder: 'Select type',
        validateMsg: {
          datasetLabelRequired: 'Please enter dataset label',
          datasetRequired: 'Please select dataset',
          descriptionRequired: 'Please enter description',
          domainRequired: 'Please select domain',
          labelRequired: 'Please enter label',
          outputIdRequired: 'Please enter output ID',
          populationRequired: 'Please select population',
          primaryProgrammerRequired: 'Please select SAS programmer',
          qcProgrammerRequired: 'Please select QC programmer',
          sdrSourceRequired: 'Please enter SDR source',
          statusRequired: 'Please select status',
          taskCategoryRequired: 'Please select category',
          taskNameRequired: 'Please enter task name',
          titleRequired: 'Please enter title',
          typeRequired: 'Please select type'
        }
      },
      popconfirm: {
        cancel: 'Cancel',
        confirm: 'Confirm'
      },
      recent: {
        clear: 'Clear',
        daysAgo: '{{count}} days ago',
        hoursAgo: '{{count}} hours ago',
        justNow: 'Just now',
        minutesAgo: '{{count}} minutes ago',
        title: 'Recent Access'
      },
      stats: {
        completed: 'Completed',
        inProgress: 'In Progress',
        inQC: 'In QC',
        notStarted: 'Not Started',
        openIssues: 'Open Issues',
        signedOff: 'Signed Off',
        total: 'Total Tasks'
      },
      title: 'Programming Tracker',
      totalTasks: '{{count}} tasks total'
    },
    studySpec: {
      addSuccess: 'Variable added successfully',
      addVariable: 'Add Variable',
      class: 'Class',
      cols: {
        action: 'Action',
        codelist: 'Codelist',
        comment: 'Comment',
        core: 'Core',
        dataType: 'Data Type',
        implementationNotes: 'Implementation Notes',
        label: 'Label',
        length: 'Length',
        origin: 'Origin',
        role: 'Role',
        sourceDerivation: 'Source/Derivation',
        sourceField: 'Source Field',
        variableName: 'Variable Name'
      },
      confirmDelete: 'Are you sure you want to delete this variable?',
      datasets: 'Datasets',
      delete: 'Delete',
      deleteSuccess: 'Variable deleted successfully',
      edit: 'Edit',
      editDrawer: {
        aiPrompt: 'AI Prompt',
        cancel: 'Cancel',
        commentPlaceholder: 'Enter comments',
        derivationPlaceholder: 'Enter derivation logic (SAS/R syntax supported)',
        implementationNotesPlaceholder: 'Describe derivation rules for AI code generation...',
        save: 'Save',
        saveSuccess: 'Variable saved successfully!',
        sourceField: 'Source Field',
        sourceFieldPlaceholder: 'Enter source field name',
        title: 'Edit Variable'
      },
      form: {
        validateMsg: {
          coreRequired: 'Please select core',
          dataTypeRequired: 'Please select data type',
          labelRequired: 'Please enter variable label',
          lengthRequired: 'Please enter length',
          roleRequired: 'Please enter role',
          variableNameRequired: 'Please enter variable name'
        }
      },
      keys: 'Keys',
      scopeContext: {
        analysis: 'Analysis',
        compound: 'Compound',
        currentScope: 'Current Scope',
        study: 'Study',
        switchAnalysis: 'Switch Analysis',
        ta: 'Therapeutic Area'
      },
      searchDataset: 'Search dataset...',
      sortSuccess: 'Variable order updated',
      structure: 'Structure',
      title: 'Study Specification',
      totalRows: '{{count}} rows total',
      totalVars: '{{count}} variables total',
      traceDrawer: {
        hint: 'This shows the official variable definition from CDISC Global Library.',
        title: 'Global Library Definition'
      },
      traceGlobalLibrary: 'Trace in Global Library',
      variables: 'Variables'
    },
    tflBuilder: {
      canvas: {
        addColumn: 'Add Column',
        addFootnote: 'Add Footnote',
        addRow: 'Add Row',
        addTitle: 'Add Title',
        dragHint: 'Drag components from left panel to add rows',
        emptyHint: 'Please create a TFL Shell first',
        parameter: 'Parameter'
      },
      context: {
        selectAnalysisForTfl: 'Select an Analysis to start designing',
        selectAnalysisHint: 'Please select an Analysis above to start designing TFL Shell'
      },
      leftPanel: {
        datasets: 'Dataset Variables',
        searchStatistics: 'Search statistics...',
        searchVariables: 'Search variables...',
        statisticHint: 'Drag components to canvas to add statistic rows',
        statistics: 'Statistics Components'
      },
      messages: {
        exported: 'Exported successfully',
        newShellCreated: 'New shell created',
        saved: 'Saved successfully',
        statisticAdded: 'Added statistic: {{name}}',
        variableAdded: 'Added variable: {{name}}'
      },
      props: {
        alignment: 'Alignment',
        columnCode: 'Filter Code',
        columnColor: 'Identifier Color',
        columnName: 'Column Name',
        deleteColumn: 'Delete Column',
        deleteFootnote: 'Delete Footnote',
        deleteRow: 'Delete Row',
        deleteTitle: 'Delete Title',
        footnoteText: 'Footnote Text',
        indentLevel: 'Indent Level',
        label: 'Label',
        name: 'Name',
        rowType: 'Row Type',
        status: 'Status',
        tflId: 'TFL ID',
        titleText: 'Title Text',
        type: 'Type'
      },
      rightPanel: {
        cell: 'Cell',
        column: 'Treatment Column',
        footnote: 'Footnote',
        row: 'Data Row',
        selectHint: 'Click an element in canvas to view properties',
        shell: 'TFL Shell',
        title: 'Title'
      },
      toolbar: {
        editMode: 'Edit Mode',
        export: 'Export JSON',
        newShell: 'New Shell',
        previewMode: 'Preview Mode',
        redo: 'Redo',
        save: 'Save',
        undo: 'Undo',
        zoomIn: 'Zoom In',
        zoomOut: 'Zoom Out'
      }
    }
  }
};

export default page;
