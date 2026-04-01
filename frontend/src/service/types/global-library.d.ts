/** Global Library module type definitions */

declare namespace Api.GlobalLibrary {
  // Tree Node types (Ant Design Tree compatible)
  interface TreeNode {
    children?: TreeNode[];
    icon?: string;
    isLeaf?: boolean;
    key: string;
    // Extended properties
    node_type?: string;
    spec_id?: number;
    spec_type?: string;
    title: string;
    value?: string;
  }

  // Dataset types
  interface DatasetListItem {
    class_type: string;
    dataset_name: string;
    description: string | null;
    id: number;
    sort_order: number;
    specification_id: number;
    variable_count: number;
  }

  interface DatasetListResponse {
    items: DatasetListItem[];
    total: number;
  }

  // Variable types (Schema-Driven 增强版)
  interface VariableListItem {
    codelist_name: string | null;
    codelist_ref: string | null;
    core: 'Exp' | 'Perm' | 'Req';
    data_type: string;
    dataset_id: number;
    // SDTM Model 专用字段
    definition: string | null;
    described_value_domain: string | null;
    description: string | null;
    examples: string | null;
    id: number;
    // SDTM IG 专用字段
    implements: { class?: string; title?: string; variable?: string } | null;
    length: number | null;
    notes: string | null;
    // Schema-Driven 新增字段
    ordinal: number | null;
    origin_type: string;
    prompt: string | null;
    qualifies_variable: string[] | null;
    // QRS 特有字段
    question_text: string | null;
    // 扩展字段
    role: string | null;
    sort_order: number;
    usage_restrictions: string | null;
    value_list: string[] | null;
    // ADaM IG 专用字段
    var_set: string | null;
    variable_ccode: string | null;
    variable_label: string | null;
    variable_name: string;
  }

  interface VariableListResponse {
    items: VariableListItem[];
    total: number;
  }

  // Specification types
  interface Specification {
    description: string | null;
    id: number;
    name: string;
    spec_type: string;
    standard_name: string | null;
    standard_version: string | null;
    version: string;
  }

  // API params types
  interface DatasetListParams {
    limit?: number;
    offset?: number;
    search?: string;
  }

  interface VariableListParams {
    core?: 'Exp' | 'Perm' | 'Req';
    limit?: number;
    offset?: number;
    search?: string;
  }

  // ============================================================
  // Schema-Driven Types
  // ============================================================

  interface ColumnSchema {
    align?: 'center' | 'left' | 'right';
    dataIndex: string;
    fixed?: 'left' | 'right';
    renderType: 'array' | 'implements' | 'longtext' | 'ordinal' | 'role' | 'tag' | 'text';
    title: { en: string; zh: string };
    width?: number;
  }

  interface TableSchema {
    columns: ColumnSchema[];
    standardType: string;
  }

  // ============================================================
  // CT (Controlled Terminology) Types
  // ============================================================

  interface CodelistListItem {
    codelist_id: string;
    definition: string | null;
    id: number;
    name: string;
    ncit_code: string | null;
    scope_node_id: number;
    sort_order: number;
    term_count: number | null;
  }

  interface CodelistListResponse {
    items: CodelistListItem[];
    total: number;
  }

  interface TermListItem {
    codelist_id: number;
    definition: string | null;
    id: number;
    name: string | null;
    ncit_code: string | null;
    sort_order: number;
    submission_value: string | null;
    term_id: string | null;
    term_value: string;
  }

  interface TermListResponse {
    items: TermListItem[];
    total: number;
  }

  interface CodelistListParams {
    limit?: number;
    offset?: number;
    search?: string;
  }

  interface TermListParams {
    limit?: number;
    offset?: number;
    search?: string;
  }
}
