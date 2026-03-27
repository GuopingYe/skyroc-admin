/** Study Spec module type definitions */

declare namespace Api.StudySpec {
  // ============================================================
  // Specification Types
  // ============================================================

  interface StudySpecListItem {
    id: number;
    scope_node_id: number;
    scope_node_code: string;
    scope_node_name: string;
    name: string;
    spec_type: 'ADaM' | 'QRS' | 'SDTM';
    version: string;
    status: 'Active' | 'Archived' | 'Draft';
    description: string | null;
    base_specification_id: number | null;
    base_specification_name: string | null;
    dataset_count: number;
    created_by: string;
    created_at: string;
    updated_by: string | null;
    updated_at: string | null;
  }

  interface StudySpecListResponse {
    total: number;
    items: StudySpecListItem[];
  }

  interface StudySpecDetail {
    id: number;
    scope_node_id: number;
    scope_node_code: string;
    scope_node_name: string;
    name: string;
    spec_type: 'ADaM' | 'QRS' | 'SDTM';
    version: string;
    status: 'Active' | 'Archived' | 'Draft';
    description: string | null;
    base_specification_id: number | null;
    base_specification: {
      id: number;
      name: string;
      spec_type: string;
      version: string;
    } | null;
    standard_name: string | null;
    standard_version: string | null;
    dataset_count: number;
    variable_count: number;
    created_by: string;
    created_at: string;
    updated_by: string | null;
    updated_at: string | null;
  }

  // ============================================================
  // Dataset Types
  // ============================================================

  interface StudyDatasetListItem {
    id: number;
    specification_id: number;
    dataset_name: string;
    description: string | null;
    class_type: string;
    sort_order: number;
    base_id: number | null;
    override_type: 'Added' | 'Deleted' | 'Modified' | 'None';
    variable_count: number;
    created_by: string;
    created_at: string;
  }

  interface StudyDatasetListResponse {
    total: number;
    items: StudyDatasetListItem[];
  }

  // ============================================================
  // Variable Types
  // ============================================================

  interface StudyVariableListItem {
    id: number;
    dataset_id: number;
    variable_name: string;
    variable_label: string | null;
    description: string | null;
    data_type: 'Char' | 'Date' | 'DateTime' | 'Num' | 'Time';
    length: number | null;
    core: 'Exp' | 'Perm' | 'Req';
    sort_order: number;
    base_id: number | null;
    override_type: 'Added' | 'Deleted' | 'Modified' | 'None';
    origin_type: 'CDISC' | 'Sponsor_Standard' | 'Study_Custom' | 'TA_Standard';
    role: string | null;
    codelist_name: string | null;
    codelist_ref: string | null;
    created_by: string;
    created_at: string;
  }

  interface StudyVariableListResponse {
    total: number;
    items: StudyVariableListItem[];
    summary: {
      total_variables: number;
      req_count: number;
      exp_count: number;
      perm_count: number;
    };
  }

  // ============================================================
  // Query Params
  // ============================================================

  interface StudySpecListParams {
    scope_node_id?: number;
    scope_node_code?: string;
    spec_type?: 'ADaM' | 'QRS' | 'SDTM';
    status?: 'Active' | 'Archived' | 'Draft';
    search?: string;
    limit?: number;
    offset?: number;
  }

  interface StudyDatasetListParams {
    search?: string;
    class_type?: string;
    limit?: number;
    offset?: number;
  }

  interface StudyVariableListParams {
    search?: string;
    core?: 'Exp' | 'Perm' | 'Req';
    origin_type?: 'CDISC' | 'Sponsor_Standard' | 'Study_Custom' | 'TA_Standard';
    limit?: number;
    offset?: number;
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
    id: number;
    dataset_name: string;
    description: string | null;
    class_type: string;
    variable_count: number;
    base_id: number;
    message: string;
  }

  /** 创建自定义 Domain 请求 */
  interface CreateCustomDatasetRequest {
    domain_name: string;
    domain_label: string;
    class_type: string;
    inherit_from_model?: boolean;
    model_version_id?: number;
  }

  /** 创建自定义 Domain 响应 */
  interface CreateCustomDatasetResponse {
    id: number;
    dataset_name: string;
    description: string | null;
    class_type: string;
    variable_count: number;
    message: string;
  }
}
