import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Loader2 
} from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  variant?: 'default' | 'compact' | 'icon' | 'simple';
  showPageSizeSelector?: boolean;
  showItemSummary?: boolean;
  showFirstLastButtons?: boolean;
  loading?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  variant = 'default',
  showPageSizeSelector = true,
  showItemSummary = true,
  showFirstLastButtons = false,
  loading = false,
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Tính toán bản ghi bắt đầu và kết thúc
  const fromItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const toItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Thuật toán sinh danh sách trang kèm dấu "..."
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      // Dưới hoặc bằng 5 trang: hiển thị tất cả
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 3) {
      // Gần đầu: 1, 2, 3, 4, 5, '...', totalPages
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (safeCurrentPage >= totalPages - 2) {
      // Gần cuối: 1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    // Ở giữa: 1, '...', page - 1, page, page + 1, '...', totalPages
    return [
      1,
      '...',
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      '...',
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== safeCurrentPage && !loading) {
      onPageChange(page);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 text-sm select-none transition-colors ${className}`}>
      
      {/* 1. KHỐI TRÁI: TỔNG HỢP SỐ LIỆU BẢN GHI */}
      <div className="sm:flex-1 flex items-center justify-start text-xs text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap order-1">
        {showItemSummary && (
          <div>
            Hiển thị <strong className="font-semibold text-slate-800 dark:text-slate-100">{fromItem} – {toItem}</strong> / <strong className="font-semibold text-slate-800 dark:text-slate-100">{totalItems}</strong> bản ghi
          </div>
        )}
      </div>

      {/* 2. KHỐI GIỮA: TÙY CHỌN SỐ BẢN GHI MỖI TRANG (CĂN GIỮA VỊ TRÍ TRUNG TÂM) */}
      {showPageSizeSelector && onPageSizeChange && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap order-2 px-3">
          <span className="font-normal text-slate-500 dark:text-slate-400">Hiển thị</span>
          <div className="relative inline-block">
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                // Tự động điều chỉnh về trang 1 để tránh lỗi index vượt ngoài tổng số trang mới
                onPageChange(1);
              }}
              disabled={loading}
              aria-label="Chọn số bản ghi mỗi trang"
              className="appearance-none pl-3 pr-7 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all disabled:opacity-50 shadow-2xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {opt}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 dark:text-slate-500">
              <span className="text-[9px]">▼</span>
            </div>
          </div>
          <span className="font-normal text-slate-500 dark:text-slate-400">bản ghi mỗi trang</span>
        </div>
      )}

      {/* 3. KHỐI PHẢI: GIAO DIỆN PHÂN TRANG (DESKTOP) */}
      <div className="hidden sm:flex sm:flex-1 items-center justify-end gap-1.5 order-3">
        {/* Nút về trang đầu tiên (Icon <<) */}
        {(showFirstLastButtons || variant === 'icon') && (
          <button
            onClick={() => handlePageClick(1)}
            disabled={safeCurrentPage === 1 || loading}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs active:scale-95"
            title="Trang đầu tiên"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        {/* Nút lùi trang (< Trước) */}
        <button
          onClick={() => handlePageClick(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1 || loading}
          className={`h-9 flex items-center justify-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs font-medium text-xs active:scale-95 ${
            variant === 'compact' || variant === 'icon' ? 'w-9 px-0' : 'px-3'
          }`}
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
          {variant !== 'compact' && variant !== 'icon' && <span>Trước</span>}
        </button>

        {/* Danh sách nút số trang */}
        {variant !== 'simple' && (
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-9 h-9 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = p as number;
              const isActive = pageNum === safeCurrentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => handlePageClick(pageNum)}
                  disabled={loading}
                  className={`min-w-[36px] h-9 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 border border-blue-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95'
                  }`}
                  aria-label={`Trang ${pageNum}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {loading && isActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    pageNum
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Kiểu hiển thị trang đơn giản (Trang x / y) */}
        {variant === 'simple' && (
          <div className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Trang {safeCurrentPage} / {totalPages}
          </div>
        )}

        {/* Nút tiến trang (Sau >) */}
        <button
          onClick={() => handlePageClick(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages || loading}
          className={`h-9 flex items-center justify-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs font-medium text-xs active:scale-95 ${
            variant === 'compact' || variant === 'icon' ? 'w-9 px-0' : 'px-3'
          }`}
          title="Trang kế tiếp"
        >
          {variant !== 'compact' && variant !== 'icon' && <span>Sau</span>}
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Nút về trang cuối cùng (Icon >>) */}
        {(showFirstLastButtons || variant === 'icon') && (
          <button
            onClick={() => handlePageClick(totalPages)}
            disabled={safeCurrentPage === totalPages || loading}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs active:scale-95"
            title="Trang cuối cùng"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* GIAO DIỆN TRÊN MOBILE (<sm): Gọn gàng, dễ bấm */}
      <div className="flex sm:hidden items-center justify-between w-full pt-2 border-t border-gray-100 dark:border-slate-700/60">
        <button
          onClick={() => handlePageClick(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1 || loading}
          className="h-8.5 px-3 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Trước</span>
        </button>

        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Trang {safeCurrentPage} / {totalPages}
        </span>

        <button
          onClick={() => handlePageClick(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages || loading}
          className="h-8.5 px-3 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs disabled:opacity-40"
        >
          <span>Sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

export default Pagination;
