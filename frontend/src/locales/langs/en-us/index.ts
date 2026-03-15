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
