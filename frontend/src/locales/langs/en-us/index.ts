import common from './common';
import form from './form';
import page from './page';
import request from './request';
import route from './route';
import theme from './theme';

const local: App.I18n.Schema['translation'] = {
  common,
  datatable: {
    itemCount: 'Total {total} items'
  },
  dropdown: {
    closeAll: 'Close All',
    closeCurrent: 'Close Current',
    closeLeft: 'Close Left',
    closeOther: 'Close Other',
    closeRight: 'Close Right'
  },
  form,
  icon: {
    collapse: 'Collapse Menu',
    expand: 'Expand Menu',
    fullscreen: 'Fullscreen',
    fullscreenExit: 'Exit Fullscreen',
    lang: 'Switch Language',
    pin: 'Pin',
    reload: 'Reload Page',
    themeConfig: 'Theme Configuration',
    themeSchema: 'Theme Schema',
    unpin: 'Unpin'
  },
  page,
  request,
  route,
  system: {
    errorReason: 'Cause Error',
    pipelineManagement: {
      lifecycleStatus: 'Lifecycle Status',
      lockedWarning: 'This node is locked. Modifications are not allowed.'
    },
    reload: 'Reload Page',
    tflDesigner: {
      // Analysis categories
      categories: {
        adverseEvents: 'Adverse Events',
        all: 'All Categories',
        baseline: 'Baseline Characteristics',
        concomitantMeds: 'Concomitant Medications',
        demographics: 'Demographics',
        disposition: 'Subject Disposition',
        ecg: 'ECG',
        efficacy: 'Efficacy',
        laboratory: 'Laboratory',
        pk: 'Pharmacokinetics',
        protocolDeviations: 'Protocol Deviations',
        vitalSigns: 'Vital Signs'
      },
      // Common
      common: {
        add: 'Add',
        all: 'All',
        apply: 'Apply',
        cancel: 'Cancel',
        close: 'Close',
        confirm: 'Confirm',
        delete: 'Delete',
        edit: 'Edit',
        error: 'Error',
        export: 'Export',
        import: 'Import',
        save: 'Save',
        search: 'Search',
        success: 'Success',
        templates: 'Templates',
        warning: 'Warning'
      },
      // Display types
      displayTypes: {
        figure: 'Figure',
        listing: 'Listing',
        table: 'Table'
      },
      // Errors
      errors: {
        invalidJSON: 'Invalid JSON file',
        parseError: 'Error parsing file'
      },
      // Export formats
      exportFormats: {
        allDisplays: 'All Displays',
        excel: 'Excel (.xlsx)',
        pdf: 'PDF',
        rtf: 'RTF',
        selectedDisplay: 'Selected Display',
        word: 'Word (.docx)'
      },
      // Figure
      figure: {
        addSeries: 'Add Series',
        axes: 'Axes',
        chartType: 'Chart Type',
        chartTypes: {
          bar: 'Bar',
          box: 'Box Plot',
          forest: 'Forest Plot',
          km_curve: 'Kaplan-Meier Curve',
          line: 'Line',
          scatter: 'Scatter',
          violin: 'Violin',
          waterfall: 'Waterfall'
        },
        color: 'Color',
        dashed: 'Dashed',
        deleteSeries: 'Delete Series',
        dotted: 'Dotted',
        line: 'Line',
        marker: 'Marker',
        reorder: 'Reorder',
        series: 'Series',
        solid: 'Solid',
        title: 'Figure',
        xAxis: 'X-Axis',
        yAxis: 'Y-Axis'
      },
      // Header styles
      headerStyles: {
        alignment: 'Alignment',
        clinicalResearch: 'Clinical Research',
        columnHeaderBackground: 'Column Header Background',
        columnHeaderFont: 'Column Header Font',
        columnHeaderSize: 'Column Header Size',
        custom: 'Custom',
        default: 'Default',
        fdaStandard: 'FDA Standard',
        minimal: 'Minimal',
        preview: 'Preview',
        professional: 'Professional',
        subtitleFont: 'Subtitle Font',
        subtitleSize: 'Subtitle Size',
        title: 'Header Styles',
        titleFont: 'Title Font',
        titleSize: 'Title Size'
      },
      // Listing
      listing: {
        addColumn: 'Add Column',
        addFilterRule: 'Add Filter Rule',
        addSortRule: 'Add Sort Rule',
        alignment: 'Alignment',
        ascending: 'Ascending',
        booleanType: 'Boolean',
        center: 'Center',
        column: 'Column',
        columns: 'Columns',
        dataType: 'Data Type',
        dateType: 'Date',
        deleteColumn: 'Delete Column',
        deleteFilterRule: 'Delete Filter Rule',
        deleteSortRule: 'Delete Sort Rule',
        descending: 'Descending',
        exitFullscreen: 'Exit Fullscreen',
        exportCSV: 'Export as CSV',
        filter: 'Filter',
        filterColumn: 'Column',
        filterRules: 'Filter Rules',
        fullscreen: 'Fullscreen',
        label: 'Label',
        left: 'Left',
        logic: 'Logic',
        moveDown: 'Move Down',
        moveToBottom: 'Move to Bottom',
        moveToTop: 'Move to Top',
        moveUp: 'Move Up',
        numberType: 'Number',
        operator: 'Operator',
        operators: {
          contains: 'Contains',
          ends_with: 'Ends With',
          eq: 'Equals (=)',
          ge: 'Greater or Equal (≥)',
          gt: 'Greater Than (>)',
          in: 'In List',
          is_null: 'Is Null',
          le: 'Less or Equal (≤)',
          lt: 'Less Than (<)',
          ne: 'Not Equals (≠)',
          not_null: 'Is Not Null',
          starts_with: 'Starts With'
        },
        pageSize: 'Page Size',
        priority: 'Priority',
        right: 'Right',
        sort: 'Sort',
        sortOrder: 'Sort Order',
        sortRules: 'Sort Rules',
        stringType: 'String',
        title: 'Listing',
        value: 'Value',
        variable: 'Variable',
        visible: 'Visible',
        width: 'Width'
      },
      // Messages
      messages: {
        atLeastOneFilter: 'At least one filter must remain',
        atLeastOneRow: 'At least one row must remain',
        atLeastOneSortRule: 'At least one sort rule must remain',
        exportSuccess: 'Export successful',
        headerStyleUpdated: 'Header style updated',
        importError: 'Import failed',
        importFileError: 'Error importing file',
        importSuccess: 'Import successful',
        populationAdded: 'Population added',
        populationDeleted: 'Population deleted',
        populationUpdated: 'Population updated',
        studyInfoUpdated: 'Study metadata updated',
        templateAdded: 'Template added',
        templateApplied: 'Template applied',
        templateDeleted: 'Template deleted',
        validationError: 'Validation error'
      },
      // Populations
      populations: {
        add: 'Add Population',
        dataset: 'Reference Dataset',
        default: 'Default',
        delete: 'Delete',
        description: 'Description',
        edit: 'Edit',
        filterExpression: 'Filter Expression',
        name: 'Population Name',
        setAsDefault: 'Set as Default',
        title: 'Populations',
        version: 'Version'
      },
      // Study metadata
      studyMetadata: {
        compound: 'Compound Under Study',
        description: 'Study Description',
        diseaseArea: 'Disease Area',
        phase: 'Study Phase',
        reset: 'Reset',
        save: 'Save',
        studyId: 'Study ID',
        studyTitle: 'Study Title',
        therapeuticArea: 'Therapeutic Area',
        title: 'Study Metadata',
        version: 'Version'
      },
      // Table
      table: {
        addPTRow: 'Add PT Row',
        addRow: 'Add Row',
        addSOCRow: 'Add SOC Row',
        collapse: 'Collapse',
        collapseAll: 'Collapse All',
        deleteRow: 'Delete Row',
        duplicateRow: 'Duplicate Row',
        expand: 'Expand',
        expandAll: 'Expand All',
        indent: 'Indent',
        label: 'Label',
        level: 'Level',
        moveDown: 'Move Down',
        moveUp: 'Move Up',
        outdent: 'Outdent',
        row: 'Row',
        rows: 'Rows',
        statistics: 'Statistics',
        title: 'Table',
        variable: 'Variable'
      },
      // Templates
      templates: {
        allTypes: 'All Types',
        applyTemplate: 'Apply Template',
        browseTemplates: 'Browse Templates',
        byCategory: 'By Category',
        byType: 'By Type',
        createdAt: 'Created',
        figures: 'Figures',
        listings: 'Listings',
        searchTemplates: 'Search Templates...',
        selectedTemplate: 'Selected Template',
        selectTemplate: 'Select Template',
        tables: 'Tables',
        templateCategory: 'Template Category',
        templateDescription: 'Description',
        templateName: 'Template Name',
        templateType: 'Template Type',
        title: 'Template Library'
      },
      title: 'TFL Designer'
    },
    tflTemplateLibrary: {},
    title: 'SkyrocAdmin',
    updateCancel: 'Later',
    updateConfirm: 'Refresh immediately',
    updateContent: 'A new version of the system has been detected. Do you want to refresh the page immediately?',
    updateTitle: 'System Version Update Notification',
    userManagement: {
      addUser: 'Add User',
      assignPermission: 'Permission',
      cols: {
        action: 'Action',
        department: 'Department',
        lastLogin: 'Last Login',
        permissions: 'Permissions',
        status: 'Status',
        user: 'User'
      },
      delete: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this user?',
      deleteSuccess: 'User deleted successfully',
      edit: 'Edit',
      editModal: {
        cancel: 'Cancel',
        department: 'Department',
        displayName: 'Display Name',
        displayNameRequired: 'Please enter display name',
        email: 'Email',
        emailInvalid: 'Please enter a valid email',
        emailRequired: 'Please enter email',
        save: 'Save',
        saveSuccess: 'User updated successfully',
        status: 'Status',
        title: 'Edit User'
      },
      filters: {
        allStatus: 'All Status'
      },
      noPermissions: 'No permissions assigned',
      permission: {
        assign: 'Assign',
        assignSuccess: 'Permission assigned successfully',
        cancel: 'Cancel',
        currentPermissions: 'Current Permissions',
        hint: 'Select pipeline nodes from the tree and assign a role. Users will have access to all child nodes of selected items.',
        rolePlaceholder: 'Choose a role...',
        selectNode: 'Select Pipeline Node',
        selectRequired: 'Please select node and role',
        selectRole: 'Select Role',
        title: 'Assign Permission'
      },
      // Permission categories
      permissionCategories: {
        admin: 'System Administration',
        metadata: 'Metadata Management',
        project: 'Project Management',
        qc: 'QC Management'
      },
      // Permission labels and descriptions
      permissions: {
        archive_node: { description: 'Archive any pipeline node', label: 'Archive Node' },
        assign_roles: { description: 'Assign roles to users', label: 'Assign Roles' },
        close_issue: { description: 'Close QC issues', label: 'Close Issue' },
        create_study: { description: 'Create new study under compound', label: 'Create Study' },
        create_ta: { description: 'Create top-level Therapeutic Area', label: 'Create TA' },
        delete_study: { description: 'Delete study and all child nodes', label: 'Delete Study' },
        delete_ta: { description: 'Delete Therapeutic Area', label: 'Delete TA' },
        edit_mapping: { description: 'Edit SDTM mapping rules', label: 'Edit Mapping' },
        edit_spec: { description: 'Edit study specification', label: 'Edit Spec' },
        export_mapping: { description: 'Export mapping definitions', label: 'Export Mapping' },
        import_sdr: { description: 'Import SDR data', label: 'Import SDR' },
        lock_study: { description: 'Lock study to prevent modifications', label: 'Lock Study' },
        manage_users: { description: 'Create, edit, delete users', label: 'Manage Users' },
        open_issue: { description: 'Create QC issues', label: 'Open Issue' },
        respond_issue: { description: 'Respond to QC issues', label: 'Respond Issue' },
        sign_off: { description: 'Sign off on deliverables', label: 'Sign Off' },
        view_audit_log: { description: 'View system audit logs', label: 'View Audit Log' }
      },
      rolePermission: {
        permissionMatrix: 'Permission Matrix',
        roleList: 'Role List',
        save: 'Save',
        saveSuccess: 'Permissions saved successfully',
        selectRoleHint: 'Please select a role from the left list',
        superAdminOnly: 'Only Super Admin can modify permissions',
        systemRole: 'System',
        title: 'Role Permission Configuration'
      },
      // Role labels and descriptions
      roles: {
        Admin: { description: 'Administrative access for assigned scope', label: 'Admin' },
        Programmer: { description: 'Primary programmer for TFL outputs and mapping', label: 'Programmer' },
        QCReviewer: { description: 'Quality control reviewer for outputs', label: 'QC Reviewer' },
        StudyLead: { description: 'Lead programmer responsible for study deliverables', label: 'Study Lead' },
        SuperAdmin: {
          description: 'Full system access with all permissions including user management',
          label: 'Super Admin'
        },
        Viewer: { description: 'Read-only access to assigned scope', label: 'Viewer' }
      },
      // Scope node types
      scopeNodes: {
        Analysis: 'Analysis',
        Compound: 'Compound',
        Study: 'Study',
        TA: 'Therapeutic Area'
      },
      searchPlaceholder: 'Search name, email...',
      stats: {
        active: 'Active',
        inactive: 'Inactive',
        locked: 'Locked',
        total: 'Total Users'
      },
      // User status labels
      status: {
        Active: 'Active',
        Inactive: 'Inactive',
        Locked: 'Locked'
      },
      title: 'User Management'
    }
  },
  theme
};

export default local;
