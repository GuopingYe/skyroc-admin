import { request } from '../request';
import { MDR_URLS } from '../urls';

// ==================== Pipeline Management ====================

/** Get available versions for Study Config dropdowns */
export function getAvailableVersions() {
  return request<{
    adamIgVersions: { label: string; value: string }[];
    adamModelVersions: { label: string; value: string }[];
    meddraVersions: { label: string; value: string }[];
    sdtmIgVersions: { label: string; value: string }[];
    sdtmModelVersions: { label: string; value: string }[];
    studyPhases: { label: string; value: string }[];
    whodrugVersions: { label: string; value: string }[];
  }>({
    url: MDR_URLS.PIPELINE_AVAILABLE_VERSIONS
  });
}

/**
 * Get the pipeline tree (TA → Compound → Study → Analysis)
 *
 * @param scopeNodeId Optional - Filter tree to show only the branch for this scope node
 */
export function getPipelineTree(scopeNodeId?: number) {
  return request<any[]>({
    params: scopeNodeId ? { scope_node_id: scopeNodeId } : undefined,
    url: MDR_URLS.PIPELINE_TREE
  });
}

/** Save role assignments for a pipeline node (batch) */
export function saveNodeRoles(nodeId: string, assignments: Array<{ action: 'assign' | 'revoke'; role_code: string; user_id: number }>) {
  return request<{ applied: number }>({
    data: { assignments },
    method: 'post',
    url: MDR_URLS.PIPELINE_NODE_ROLES.replace(':id', nodeId),
  });
}

/** Search users for role assignment dropdown */
export function searchPipelineUsers(q: string, limit = 20) {
  return request<Array<{ department: string | null; display_name: string | null; email: string; user_id: number; username: string }>>({
    params: { limit, q },
    url: MDR_URLS.PIPELINE_USERS_SEARCH,
  });
}

/** Get all products (Compounds), optionally filtered by therapeutic area */
export function getPipelineProducts(taId?: string) {
  return request<any[]>({
    params: taId ? { ta_id: taId } : undefined,
    url: MDR_URLS.PIPELINE_PRODUCTS
  });
}

/** Get studies filtered by product ID */
export function getPipelineStudies(productId?: string) {
  return request<any[]>({
    params: productId ? { product_id: productId } : undefined,
    url: MDR_URLS.PIPELINE_STUDIES
  });
}

/** Get analyses filtered by study ID */
export function getPipelineAnalyses(studyId?: string) {
  return request<any[]>({
    params: studyId ? { study_id: studyId } : undefined,
    url: MDR_URLS.PIPELINE_ANALYSES
  });
}

/** Create a new node (TA, Compound, Study, or Analysis) */
export function createPipelineNode(data: {
  description?: string;
  node_type: string;
  parent_id?: string;
  phase?: string;
  protocol_title?: string;
  title: string;
}) {
  return request<any>({
    data,
    method: 'post',
    url: MDR_URLS.PIPELINE_NODE_CREATE
  });
}

/** Toggle archive status for a pipeline node */
export function archivePipelineNode(nodeId: string, status: 'Active' | 'Archived') {
  return request<any>({
    data: { status },
    method: 'put',
    url: MDR_URLS.PIPELINE_NODE_ARCHIVE.replace(':id', nodeId)
  });
}

/** Get study configuration */
export function getPipelineStudyConfig(studyId: string) {
  return request<any>({
    url: MDR_URLS.PIPELINE_STUDY_CONFIG.replace(':id', studyId)
  });
}

/** Update study configuration */
export function updatePipelineStudyConfig(
  studyId: string,
  data: {
    adam_ig_version?: string;
    adam_model_version?: string;
    meddra_version?: string;
    phase?: string;
    protocol_title?: string;
    sdtm_ig_version?: string;
    sdtm_model_version?: string;
    whodrug_version?: string;
  }
) {
  return request<any>({
    data,
    method: 'put',
    url: MDR_URLS.PIPELINE_STUDY_CONFIG.replace(':id', studyId)
  });
}

/** Get milestones for a study (optionally filtered by analysis) */
export function getPipelineMilestones(studyId: string, analysisId?: string) {
  return request<any[]>({
    params: { analysis_id: analysisId, study_id: studyId },
    url: MDR_URLS.PIPELINE_MILESTONES
  });
}

/** Create a milestone */
export function createPipelineMilestone(data: {
  actual_date?: string | null;
  analysis_id?: string;
  assignee?: string;
  comment?: string;
  level: string;
  name: string;
  planned_date?: string | null;
  preset_type: string;
  status: string;
  study_id: string;
}) {
  return request<any>({
    data,
    method: 'post',
    url: MDR_URLS.PIPELINE_MILESTONES
  });
}

/** Update a milestone */
export function updatePipelineMilestone(
  milestoneId: string,
  data: {
    actual_date?: string | null;
    assignee?: string;
    comment?: string;
    name?: string;
    planned_date?: string | null;
    status?: string;
  }
) {
  return request<any>({
    data,
    method: 'put',
    url: MDR_URLS.PIPELINE_MILESTONE_DETAIL.replace(':id', milestoneId)
  });
}

/** Delete a milestone */
export function deletePipelineMilestone(milestoneId: string) {
  return request<any>({
    method: 'delete',
    url: MDR_URLS.PIPELINE_MILESTONE_DETAIL.replace(':id', milestoneId)
  });
}

/** Get execution jobs for an analysis */
export function getPipelineExecutionJobs(analysisId: string) {
  return request<any[]>({
    params: { analysis_id: analysisId },
    url: MDR_URLS.PIPELINE_EXECUTION_JOBS
  });
}

/**
 * Get tracker task list
 *
 * @param analysisId Analysis ID (required)
 * @param category Task category filter (optional)
 */
export function getTrackerTaskList(analysisId: string, category?: Api.MDR.TaskCategory) {
  // Map category to backend deliverable_type
  const categoryMap: Record<Api.MDR.TaskCategory, string> = {
    ADaM: 'ADaM',
    Other: 'OTHER_LOOKUP',
    SDTM: 'SDTM',
    TFL: 'TFL'
  };

  return request<{ items: any[]; total: number }>({
    params: {
      analysisId, // 使用 camelCase 匹配后端
      ...(category ? { deliverable_type: categoryMap[category] } : {})
    },
    url: MDR_URLS.TRACKER_TASK_LIST
  });
}

/**
 * Create tracker task
 *
 * @param data Task creation parameters
 */
export function createTrackerTask(data: {
  analysis_id: number;
  created_by: string;
  deliverable_name: string;
  // snake_case to match backend Pydantic schema
  deliverable_type: string;
  description?: string;
  prod_programmer_id?: string;
  qc_programmer_id?: string;
  task_name: string;
  tfl_metadata?: Record<string, unknown>;
}) {
  return request<{ id: number }>({
    data,
    method: 'post',
    url: MDR_URLS.TRACKER_TASK_CREATE
  });
}

/**
 * Update tracker task
 *
 * @param taskId Task ID
 * @param data Task update parameters
 */
export function updateTrackerTask(taskId: string, data: Record<string, unknown>) {
  return request<boolean>({
    data,
    method: 'put',
    url: MDR_URLS.TRACKER_TASK_UPDATE.replace(':id', taskId)
  });
}

/**
 * Delete tracker task (soft delete)
 *
 * @param taskId Task ID
 */
export function deleteTrackerTask(taskId: string) {
  return request<boolean>({
    method: 'delete',
    url: MDR_URLS.TRACKER_TASK_DELETE.replace(':id', taskId)
  });
}

/**
 * Get tracker task detail
 *
 * @param taskId Task ID
 */
export function getTrackerTaskDetail(taskId: string) {
  return request<any>({
    url: MDR_URLS.TRACKER_TASK_DETAIL.replace(':id', taskId)
  });
}

/**
 * Transition tracker task status
 *
 * @param taskId Task ID
 * @param transition Transition type (e.g., 'start_programming', 'submit_for_qc', 'start_qc', 'pass_qc', 'fail_qc')
 * @param userId User ID performing the transition
 */
export function transitionTrackerTask(
  taskId: string,
  transition: 'fail_qc' | 'pass_qc' | 'start_programming' | 'start_qc' | 'submit_for_qc',
  userId: string
) {
  return request<boolean>({
    data: { transition, user_id: userId },
    method: 'post',
    url: MDR_URLS.TRACKER_TASK_TRANSITION.replace(':id', taskId)
  });
}

/**
 * Get tracker issues
 *
 * @param taskId Task ID
 */
export function getTrackerIssues(taskId: string) {
  return request<{ items: any[]; total: number }>({
    url: MDR_URLS.TRACKER_ISSUES.replace(':taskId', taskId)
  });
}

/**
 * Create tracker issue
 *
 * @param taskId Task ID
 * @param data Issue creation parameters
 */
export function createTrackerIssue(
  taskId: string,
  data: {
    finding_category?: string;
    finding_description: string;
    qc_cycle: string;
    raised_by: string;
    raised_by_name?: string;
    severity?: string;
  }
) {
  return request<{ id: number }>({
    data,
    method: 'post',
    url: MDR_URLS.TRACKER_ISSUE_CREATE.replace(':taskId', taskId)
  });
}

/**
 * Respond to tracker issue
 *
 * @param issueId Issue ID
 * @param data Response parameters
 */
export function respondToTrackerIssue(
  issueId: string,
  data: {
    developer_response: string;
    responded_by: string;
    responded_by_name?: string;
  }
) {
  return request<boolean>({
    data,
    method: 'put',
    url: MDR_URLS.TRACKER_ISSUE_RESPONSE.replace(':issueId', issueId)
  });
}

/**
 * Create spec variable
 *
 * @param data Variable creation parameters
 */
export function createSpecVariable(data: Api.MDR.SpecVariableCreateParams) {
  return request<string>({
    data,
    method: 'post',
    url: MDR_URLS.SPEC_VARIABLE_CREATE
  });
}

/**
 * Update spec variable
 *
 * @param data Variable update parameters
 */
export function updateSpecVariable(data: Api.MDR.SpecVariableUpdateParams) {
  const { id, ...params } = data;
  return request<boolean>({
    data: params,
    method: 'put',
    url: MDR_URLS.SPEC_VARIABLE_UPDATE.replace(':id', id)
  });
}

/**
 * Delete spec variable
 *
 * @param variableId Variable ID
 */
export function deleteSpecVariable(variableId: string) {
  return request<boolean>({
    method: 'delete',
    url: MDR_URLS.SPEC_VARIABLE_DELETE.replace(':id', variableId)
  });
}

/**
 * Get spec variable list
 *
 * @param datasetKey Dataset key
 * @param standard Standard type
 */
export function getSpecVariableList(datasetKey: string, standard: Api.MDR.StandardType) {
  return request<Api.MDR.SpecVariable[]>({
    params: { datasetKey, standard },
    url: MDR_URLS.SPEC_VARIABLE_LIST
  });
}

// ==================== TFL Shells ====================

/**
 * TFL Shell types for API requests (matches backend ARSDisplay schema) Backend uses: display_id, display_type,
 * display_config
 */
export interface TFLShellCreate {
  display_config?: Record<string, unknown> | null;
  display_id: string; // e.g., "Table 14.1.1"
  display_type: 'Figure' | 'Listing' | 'Table';
  extra_attrs?: Record<string, unknown> | null;
  footnote?: string | null;
  scope_node_id: number;
  sort_order?: number;
  subtitle?: string | null;
  title: string;
}

export interface TFLShellUpdate {
  display_config?: Record<string, unknown> | null;
  display_id?: string;
  display_type?: 'Figure' | 'Listing' | 'Table';
  extra_attrs?: Record<string, unknown> | null;
  footnote?: string | null;
  sort_order?: number;
  subtitle?: string | null;
  title?: string;
  updated_by: string;
}

/** Get all TFL shells for a scope (analysis) */
export function getTFLShells(scopeNodeId: number) {
  return request<{ items: any[]; total: number }>({
    params: { scope_node_id: scopeNodeId },
    url: MDR_URLS.TFL_SHELLS
  });
}

/** Get a single TFL shell by ID */
export function getTFLShellDetail(shellId: string) {
  return request<any>({
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', shellId)
  });
}

/** Create a new TFL shell */
export function createTFLShell(data: TFLShellCreate) {
  return request<{ id: number; message: string; shell: any }>({
    data,
    method: 'post',
    url: MDR_URLS.TFL_SHELL_CREATE
  });
}

/** Update an existing TFL shell */
export function updateTFLShell(shellId: string, data: TFLShellUpdate) {
  return request<{ message: string; shell: any; success: boolean }>({
    data,
    method: 'put',
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', shellId)
  });
}

/** Delete a TFL shell (soft delete) */
export function deleteTFLShell(shellId: string) {
  return request<{ message: string; success: boolean }>({
    method: 'delete',
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', shellId)
  });
}

/** Batch update shell order */
export function updateTFLShellOrder(updates: Array<{ id: number; sort_order: number }>, updatedBy: string) {
  return request<{ message: string; success: boolean }>({
    data: { updated_by: updatedBy, updates },
    method: 'put',
    url: MDR_URLS.TFL_SHELLS_ORDER
  });
}

// ==================== TFL Tables ====================

export function getTFLTables(scopeNodeId: number) {
  return request<{ items: any[]; total: number }>({
    params: { display_type: 'Table', scope_node_id: scopeNodeId },
    url: MDR_URLS.TFL_SHELLS
  });
}

export function getTFLTableDetail(tableId: string) {
  return request<any>({
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', tableId)
  });
}

export function createTFLTable(data: Omit<TFLShellCreate, 'display_type'>) {
  return request<{ id: number; message: string; shell: any }>({
    data: { ...data, display_type: 'Table' },
    method: 'post',
    url: MDR_URLS.TFL_SHELL_CREATE
  });
}

export function updateTFLTable(tableId: string, data: Omit<TFLShellUpdate, 'display_type'>) {
  return request<{ message: string; shell: any; success: boolean }>({
    data,
    method: 'put',
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', tableId)
  });
}

export function deleteTFLTable(tableId: string) {
  return request<{ message: string; success: boolean }>({
    method: 'delete',
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', tableId)
  });
}

// ==================== TFL Figures ====================

export function getTFLFigures(scopeNodeId: number) {
  return request<{ items: any[]; total: number }>({
    params: { display_type: 'Figure', scope_node_id: scopeNodeId },
    url: MDR_URLS.TFL_SHELLS
  });
}

export function getTFLFigureDetail(figureId: string) {
  return request<any>({
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', figureId)
  });
}

export function createTFLFigure(data: Omit<TFLShellCreate, 'display_type'>) {
  return request<{ id: number; message: string; shell: any }>({
    data: { ...data, display_type: 'Figure' },
    method: 'post',
    url: MDR_URLS.TFL_SHELL_CREATE
  });
}

export function updateTFLFigure(figureId: string, data: Omit<TFLShellUpdate, 'display_type'>) {
  return request<{ message: string; shell: any; success: boolean }>({
    data,
    method: 'put',
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', figureId)
  });
}

export function deleteTFLFigure(figureId: string) {
  return request<{ message: string; success: boolean }>({
    method: 'delete',
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', figureId)
  });
}

// ==================== TFL Listings ====================

export function getTFLListings(scopeNodeId: number) {
  return request<{ items: any[]; total: number }>({
    params: { display_type: 'Listing', scope_node_id: scopeNodeId },
    url: MDR_URLS.TFL_SHELLS
  });
}

export function getTFLListingDetail(listingId: string) {
  return request<any>({
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', listingId)
  });
}

export function createTFLListing(data: Omit<TFLShellCreate, 'display_type'>) {
  return request<{ id: number; message: string; shell: any }>({
    data: { ...data, display_type: 'Listing' },
    method: 'post',
    url: MDR_URLS.TFL_SHELL_CREATE
  });
}

export function updateTFLListing(listingId: string, data: Omit<TFLShellUpdate, 'display_type'>) {
  return request<{ message: string; shell: any; success: boolean }>({
    data,
    method: 'put',
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', listingId)
  });
}

export function deleteTFLListing(listingId: string) {
  return request<{ message: string; success: boolean }>({
    method: 'delete',
    url: MDR_URLS.TFL_SHELL_DETAIL.replace(':id', listingId)
  });
}
