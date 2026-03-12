'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { IndianState } from '@/shared/types';

interface IndianStateSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

interface IndianStatesResponse {
  success?: boolean;
  error?: string;
  data?: IndianState[];
}

export function IndianStateSelect({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select state',
  searchPlaceholder = 'Search state...',
  emptyMessage = 'No state found.',
  className,
}: IndianStateSelectProps) {
  const [open, setOpen] = useState(false);
  const [states, setStates] = useState<IndianState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadStates = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch('/api/meta/indian-states', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'force-cache',
        });

        const data = (await response.json()) as IndianStatesResponse;

        if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
          throw new Error(data.error || 'Failed to load Indian states.');
        }

        if (isActive) {
          setStates(data.data);
        }
      } catch (error) {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load Indian states.');
          setStates([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadStates();

    return () => {
      isActive = false;
    };
  }, []);

  const selectedState = useMemo(
    () => states.find((state) => state.name === value) ?? null,
    [states, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading || Boolean(loadError)}
          className={cn('w-full justify-between', className)}
        >
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading states...
            </span>
          ) : selectedState ? (
            <span className="truncate">{selectedState.name}</span>
          ) : loadError ? (
            <span className="truncate text-destructive">{loadError}</span>
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {states.map((state) => (
                <CommandItem
                  key={state.code}
                  value={`${state.name} ${state.code} ${state.type}`}
                  onSelect={() => {
                    onValueChange(state.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedState?.code === state.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{state.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {state.code} • {state.type === 'state' ? 'State' : 'Union Territory'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
