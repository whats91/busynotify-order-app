// =====================================================
// COMPANY SELECTOR COMPONENT - Sidebar popup for company selection
// =====================================================

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { authService } from '@/versions/v1/services';
import { useAuthStore, useCompanyStore, useCustomerStore } from '../lib/stores';
import type { Company } from '../types';

let companiesRequest: Promise<void> | null = null;

interface CompanySelectorProps {
  collapsed?: boolean;
  className?: string;
  side?: 'top' | 'right' | 'bottom';
}

export function CompanySelector({
  collapsed = false,
  className,
  side = 'top',
}: CompanySelectorProps) {
  const {
    selectedCompany,
    companies,
    setSelectedCompany,
    setCompanies,
    isLoading,
    setLoading,
    error,
    setError,
    _hasHydrated,
  } = useCompanyStore();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setCustomer = useCustomerStore((state) => state.setCustomer);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [isSwitchingCompany, setIsSwitchingCompany] = useState(false);
  const hasAutoSelected = useRef(false);
  const canSwitchCompanies =
    user?.role !== 'customer' || companies.length > 1;

  useEffect(() => {
    setMounted(true);

    if (user?.role === 'customer') {
      return;
    }

    if (companies.length > 0 || companiesRequest) {
      return;
    }

    const fetchCompanies = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/companies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.success && data.data) {
          setCompanies(data.data);
        } else {
          setError(data.error || 'Failed to fetch companies');
        }
      } catch (err) {
        setError('Failed to fetch companies');
        console.error('Error fetching companies:', err);
      } finally {
        companiesRequest = null;
        setLoading(false);
      }
    };

    companiesRequest = fetchCompanies();
  }, [companies.length, setCompanies, setError, setLoading, user?.role]);

  useEffect(() => {
    if (!_hasHydrated || hasAutoSelected.current) {
      return;
    }

    if (!selectedCompany && companies.length > 0) {
      hasAutoSelected.current = true;
      if (user?.role !== 'customer' || companies.length === 1) {
        setSelectedCompany(companies[0]);
      }
    }
  }, [_hasHydrated, companies, selectedCompany, setSelectedCompany, user?.role]);

  const handleCompanyChange = useCallback(async (companyId: string) => {
    const company = companies.find((item: Company) => item.companyId.toString() === companyId);
    if (!company) {
      return;
    }

    if (selectedCompany?.companyId === company.companyId) {
      setOpen(false);
      return;
    }

    if (user?.role !== 'customer') {
      setSelectedCompany(company);
      setOpen(false);
      return;
    }

    if (!user.phone) {
      toast({
        variant: 'destructive',
        title: 'Unable to switch company',
        description: 'Your WhatsApp number is missing. Please log in again.',
      });
      return;
    }

    setIsSwitchingCompany(true);

    try {
      const result = await authService.validateCustomerCompany({
        companyId: company.companyId,
        financialYear: company.financialYear,
        whatsappNumber: user.phone,
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Company validation failed',
          description: result.error || 'Unable to validate your account for this company.',
        });
        return;
      }

      if (!result.isValid || !result.customerId || !result.customerName) {
        toast({
          variant: 'destructive',
          title: 'Company switch blocked',
          description: 'Your WhatsApp number is not registered for the selected company.',
        });
        return;
      }

      setSelectedCompany(company);
      setCustomer({
        customerId: result.customerId,
        customerName: result.customerName,
      });
      setUser({
        ...user,
        id: result.customerId,
        name: result.customerName,
      });
      setOpen(false);
    } finally {
      setIsSwitchingCompany(false);
    }
  }, [companies, selectedCompany?.companyId, setCustomer, setSelectedCompany, setUser, user]);

  const triggerLabel = selectedCompany?.companyName || 'Select company';
  const triggerSubLabel = selectedCompany
    ? `FY ${selectedCompany.financialYear}`
    : isLoading
      ? 'Loading companies'
      : 'Choose a company';

  if (!mounted) {
    return (
      <div
        className={cn(
          'rounded-xl border bg-background/80',
          collapsed ? 'h-10 w-10' : 'h-12 w-full',
          className
        )}
      />
    );
  }

  if (error && companies.length === 0) {
    return (
      <Button
        variant="outline"
        className={cn(
          'border-dashed text-muted-foreground',
          collapsed ? 'h-10 w-10 p-0' : 'h-12 w-full justify-start px-3',
          className
        )}
        disabled
        title="Unable to load companies"
      >
        <Building2 className="h-4 w-4 shrink-0" />
        {!collapsed ? (
          <span className="ml-3 truncate text-sm">Unable to load companies</span>
        ) : null}
      </Button>
    );
  }

  return (
    <Popover open={canSwitchCompanies ? open : false} onOpenChange={canSwitchCompanies ? setOpen : undefined}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'border-border/80 bg-background/80 hover:bg-background/90 disabled:cursor-default disabled:opacity-100',
            collapsed
              ? 'h-10 w-10 p-0 justify-center'
              : 'h-auto w-full justify-between rounded-xl px-3 py-2.5',
            className
          )}
          title={triggerLabel}
          disabled={isSwitchingCompany || !canSwitchCompanies}
        >
          <div className={cn('flex min-w-0 items-center', collapsed ? 'justify-center' : 'gap-3')}>
            {isSwitchingCompany || (isLoading && companies.length === 0) ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {!collapsed ? (
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-medium">{triggerLabel}</p>
                <p className="truncate text-xs text-muted-foreground">{triggerSubLabel}</p>
              </div>
            ) : null}
          </div>
          {!collapsed && canSwitchCompanies ? (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : null}
        </Button>
      </PopoverTrigger>
      {canSwitchCompanies ? (
        <PopoverContent
          side={side}
          align="start"
          className="w-[320px] p-0"
        >
          <Command>
            <CommandInput placeholder="Search company..." />
            <CommandList>
              <CommandEmpty>No company found.</CommandEmpty>
              <CommandGroup>
                {companies.map((company: Company) => (
                  <CommandItem
                    key={company.companyId}
                    value={`${company.companyName} ${company.erpCode} ${company.financialYear}`}
                    onSelect={() => {
                      void handleCompanyChange(company.companyId.toString());
                    }}
                    disabled={isSwitchingCompany}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedCompany?.companyId === company.companyId ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{company.companyName}</span>
                      <span className="text-xs text-muted-foreground">
                        {company.erpCode} • FY {company.financialYear}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      ) : null}
    </Popover>
  );
}
