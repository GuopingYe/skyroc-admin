/**
 * 命名空间 Api.ReferenceData
 *
 * 后端 API 模块：参考数据管理
 */
declare namespace Api {
  namespace ReferenceData {
    /** 参考数据分类 */
    type Category =
      | 'POPULATION'
      | 'SDTM_DOMAIN'
      | 'ADAM_DATASET'
      | 'STUDY_PHASE'
      | 'STAT_TYPE'
      | 'DISPLAY_TYPE'
      | 'ANALYSIS_CATEGORY'
      | 'THERAPEUTIC_AREA'
      | 'REGULATORY_AGENCY'
      | 'CONTROL_TYPE'
      | 'BLINDING_STATUS'
      | 'STUDY_DESIGN';

    /** 分类汇总 */
    interface CategorySummary {
      /** 分类编码 */
      category: string;
      /** 分类标签 */
      label: string;
      /** 总数 */
      count: number;
      /** 激活数 */
      active_count: number;
    }

    /** 参考数据项 */
    interface ReferenceDataItem {
      /** 数据项 ID */
      id: number;
      /** 分类 */
      category: string;
      /** 编码 */
      code: string;
      /** 标签 */
      label: string;
      /** 描述 */
      description: string | null;
      /** 排序 */
      sort_order: number;
      /** 扩展元数据 */
      metadata_: Record<string, unknown> | null;
      /** 是否激活 */
      is_active: boolean;
      /** 是否已删除 */
      is_deleted: boolean;
      /** 删除时间 */
      deleted_at: string | null;
      /** 删除人 */
      deleted_by: string | null;
      /** 创建时间 */
      created_at: string;
      /** 更新时间 */
      updated_at: string;
    }

    /** 创建请求 */
    interface CreateRequest {
      code: string;
      label: string;
      description?: string | null;
      sort_order?: number;
      metadata_?: Record<string, unknown> | null;
    }

    /** 更新请求 */
    interface UpdateRequest {
      label?: string | null;
      description?: string | null;
      sort_order?: number | null;
      is_active?: boolean | null;
      metadata_?: Record<string, unknown> | null;
    }

    /** 下拉选项 */
    interface DropdownOption {
      label: string;
      value: string;
    }

    /** 分页响应 */
    interface PaginatedResponse {
      total: number;
      items: ReferenceDataItem[];
      offset: number;
      limit: number;
    }
  }
}
