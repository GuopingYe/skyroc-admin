/** Study Spec module type definitions */

declare namespace Api.StudySpec {
  // ============================================================
  // Specification Types
  // ============================================================

  interface StudySpecListItem {
    base_specification_id: number | null;
    base_specification_name: string | null;
    created_at: string;
    created_by: string;
    dataset_count: number;
    description: string | null;
    id: number;
    name: string;
    scope_node_code: string;
    scope_node_id: number;
    scope_node_name: string;
    spec_type: 'ADaM' | 'QRS' | 'SDTM';
    status: 'Active' | 'Archived' | 'Draft';
    updated_at: string | null;
    updated_by: string | null;
    version: string;
  }

  interface StudySpecListResponse {
    items: StudySpecListItem[];
    total: number;
  }

  interface StudySpecDetail {
    base_specification: {
      id: number;
      name: string;
      spec_type: string;
      version: string;
    } | null;
    base_specification_id: number | null;
    created_at: string;
    created_by: string;
    dataset_count: number;
    description: string | null;
    id: number;
    name: string;
    scope_node_code: string;
    scope_node_id: number;
    scope_node_name: string;
    spec_type: 'ADaM' | 'QRS' | 'SDTM';
    standard_name: string | null;
    standard_version: string | null;
    status: 'Active' | 'Archived' | 'Draft';
    updated_at: string | null;
    updated_by: string | null;
    variable_count: number;
    version: string;
  }

  // ============================================================
  // Dataset Types
  // ============================================================

  interface StudyDatasetListItem {
    base_id: number | null;
    class_type: string;
    created_at: string;
    created_by: string;
    dataset_name: string;
    description: string | null;
    extra_attrs: {
      comments?: string;
      [key: string]: unknown;
    } | null;
    id: number;
    override_type: 'Added' | 'Deleted' | 'Modified' | 'None';
    sort_order: number;
    specification_id: number;
    standard_metadata: {
      key_variables?: string[];
      sort_variables?: string[];
      structure?: string;
      [key: string]: unknown;
    } | null;
    variable_count: number;
  }

  interface StudyDatasetListResponse {
    items: StudyDatasetListItem[];
    total: number;
  }

  // ============================================================
  // Variable Types
  // ============================================================

  interface StudyVariableListItem {
    base_id: number | null;
    codelist_name: string | null;
    codelist_ref: string | null;
    core: 'Exp' | 'Perm' | 'Req';
    created_at: string;
    created_by: string;
    data_type: 'Char' | 'Date' | 'DateTime' | 'Num' | 'Time';
    dataset_id: number;
    description: string | null;
    id: number;
    length: number | null;
    origin_type: 'CDISC' | 'Sponsor_Standard' | 'Study_Custom' | 'TA_Standard';
    override_type: 'Added' | 'Deleted' | 'Modified' | 'None';
    role: string | null;
    sort_order: number;
    variable_label: string | null;
    variable_name: string;
  }

  interface StudyVariableListResponse {
    items: StudyVariableListItem[];
    summary: {
      exp_count: number;
      perm_count: number;
      req_count: number;
      total_variables: number;
    };
    total: number;
  }

  // ============================================================
  // Query Params
  // ============================================================

  interface StudySpecListParams {
    limit?: number;
    offset?: number;
    scope_node_code?: string;
    scope_node_id?: number;
    search?: string;
    spec_type?: 'ADaM' | 'QRS' | 'SDTM';
    status?: 'Active' | 'Archived' | 'Draft';
  }

  interface StudyDatasetListParams {
    class_type?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }

  interface StudyVariableListParams {
    core?: 'Exp' | 'Perm' | 'Req';
    limit?: number;
    offset?: number;
    origin_type?: 'CDISC' | 'Sponsor_Standard' | 'Study_Custom' | 'TA_Standard';
    search?: string;
  }

  // ============================================================
  // Add Dataset Types
  // ============================================================

  /** 从 Global Library 添加 Dataset 请求 */
  interface AddDatasetFromGlobalLibraryRequest {
    base_dataset_id: number;
  }

  /** 从 Global Library 添加 Dataset 响应 */
  interface AddDatasetFromGlobalLibraryResponse {
    base_id: number;
    class_type: string;
    dataset_name: string;
    description: string | null;
    id: number;
    message: string;
    variable_count: number;
  }

  /** 创建自定义 Domain 请求 */
  interface CreateCustomDatasetRequest {
    class_type: string;
    domain_label: string;
    domain_name: string;
    inherit_from_model?: boolean;
    model_version_id?: number;
  }

  /** 创建自定义 Domain 响应 */
  interface CreateCustomDatasetResponse {
    class_type: string;
    dataset_name: string;
    description: string | null;
    id: number;
    message: string;
    variable_count: number;
  }

  /** PATCH Dataset 请求 */
  interface PatchDatasetRequest {
    class_type?: string;
    comments?: string;
    domain_label?: string;
    domain_name?: string;
    key_variables?: string[];
    sort_variables?: string[];
    structure?: string;
  }

  /** PATCH Dataset 响应 */
  type PatchDatasetResponse = StudyDatasetListItem;
}
