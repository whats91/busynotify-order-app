// =====================================================
// PROFESSIONAL FOOTER BAR - With pagination and stats
// =====================================================

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FooterBarProps {
  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  
  // Optional features
  showPageSize?: boolean;
  className?: string;
  isMobile?: boolean;
}

export function FooterBar({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  className,
  isMobile = false,
}: FooterBarProps) {
  // Generate page numbers to display (show limited pages for clean UI)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 3;
    
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className={cn(
      "border-t bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80",
      isMobile ? "lg:hidden" : "hidden lg:block",
      className
    )}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Left: Item count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <Package className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">
            {startIndex} - {endIndex} of {totalItems}
          </span>
          <span className="sm:hidden text-xs">
            {startIndex}-{endIndex} / {totalItems}
          </span>
        </div>

        {/* Center: Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-0.5">
            {/* First page */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hidden sm:flex"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-3 w-3" />
            </Button>
            
            {/* Previous */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-0.5">
              {getPageNumbers().map((page, index) => (
                <React.Fragment key={index}>
                  {page === 'ellipsis' ? (
                    <span className="px-1 text-[10px] text-muted-foreground">...</span>
                  ) : (
                    <Button
                      variant={currentPage === page ? "default" : "ghost"}
                      size="icon"
                      className={cn(
                        "h-6 w-6 text-[10px] font-medium",
                        currentPage === page && "h-6 w-6"
                      )}
                      onClick={() => onPageChange(page)}
                    >
                      {page}
                    </Button>
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Next */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            
            {/* Last page */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hidden sm:flex"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Right: Page jump & info */}
        <div className="flex items-center gap-1.5 shrink-0">
          {totalPages > 1 && (
            <>
              <span className="text-[10px] text-muted-foreground hidden md:inline">
                Pg
              </span>
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    onPageChange(page);
                  }
                }}
                className="w-10 h-6 text-center text-[10px] px-0"
              />
              <span className="text-[10px] text-muted-foreground">
                / {totalPages}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile-optimized footer for cart
interface MobileCartFooterProps {
  totalItems: number;
  total: number;
  onClearCart: () => void;
  onViewCart: () => void;
  formatCurrency: (amount: number) => string;
}

export function MobileCartFooter({
  totalItems,
  total,
  onClearCart,
  onViewCart,
  formatCurrency,
}: MobileCartFooterProps) {
  if (totalItems === 0) return null;

  return (
    <div className="border-t bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-xs">{totalItems}</span>
            <span className="text-[10px] text-muted-foreground">items</span>
          </div>
          <div className="h-3 w-px bg-border shrink-0" />
          <span className="truncate font-bold text-xs">{formatCurrency(total)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-destructive hover:text-destructive px-2"
            onClick={onClearCart}
          >
            Clear
          </Button>
          <Button
            size="sm"
            className="h-7 text-[10px] px-2"
            onClick={onViewCart}
          >
            View Cart
          </Button>
        </div>
      </div>
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
