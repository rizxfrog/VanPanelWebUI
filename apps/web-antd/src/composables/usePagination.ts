import { reactive } from 'vue';

export interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: string[];
}

export function usePagination(options?: PaginationOptions) {
  const {
    initialPage = 1,
    initialPageSize = 20,
    pageSizeOptions = ['10', '20', '50', '100'],
  } = options ?? {};

  const paginationConfig = reactive({
    current: initialPage,
    pageSize: initialPageSize,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions,
    showTotal: (total: number, range: [number, number]) =>
      `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
  });

  function handleTableChange(pagination: { current: number; pageSize: number }) {
    paginationConfig.current = pagination.current;
    paginationConfig.pageSize = pagination.pageSize;
  }

  function resetPagination() {
    paginationConfig.current = initialPage;
  }

  return { paginationConfig, handleTableChange, resetPagination };
}
