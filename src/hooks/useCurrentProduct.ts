/**
 * Current Product Hook
 * React hook for fetching the current product running on a machine
 */

import { useState, useEffect } from 'react';
import { getTagTypeOptions, TagTypeOption } from '../services/tagTypeService';

interface UseCurrentProductParams {
  machineId: number;
  start: string;
  end: string;
  enabled?: boolean;
}

interface UseCurrentProductResult {
  productId: string | null; // Product code or identifier (e.g., VCPB841D-18)
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch current product running on machine
 * Uses TagType 24 with specific filter to get product information
 */
export function useCurrentProduct(params: UseCurrentProductParams): UseCurrentProductResult {
  const { machineId, start, end, enabled = true } = params;

  const [productId, setProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getTagTypeOptions({
        tagTypeId: 24,
        machineId,
        filter: 'TagMode:Filter;TagId:50478;PlannedProductionTime:true',
        start,
        end,
        dateType: 'calendar',
      });

      if (__DEV__) console.debug('🏷️ Current product raw options:', JSON.stringify(result));

      const extractCode = (name: string): string => {
        // Common patterns to try in order
        // 1. Prefix before "-Product" (with or without trailing space)
        // 2. Prefix before " - Product" (extra spaces)
        // 3. After "Product:" or "Product=" markers
        // 4. Fallback: first space-delimited token or entire name
        const trimmed = name.trim();

        const patterns: RegExp[] = [
          /^(.*?)-Product\b.*/i, // CODE-Product
          /^(.*?)\s*-\s*Product\b.*/i, // CODE - Product
          /^Product\s*[:=]\s*(.*?)$/i, // Product: CODE
        ];
        for (const rx of patterns) {
          const m = trimmed.match(rx);
          if (m && m[1]) {
            return m[1].trim();
          }
        }
        // If contains -Product without space variation
        const idx = trimmed.indexOf('-Product');
        if (idx > 0) return trimmed.substring(0, idx).trim();
        // Fallback: take first token (allow hyphens & underscores & dots)
        const tokenMatch = trimmed.match(/^[A-Za-z0-9_][A-Za-z0-9_.-]*/);
        if (tokenMatch) return tokenMatch[0];
        return trimmed;
      };

      // Structured options usually contain '-Product '. Prioritize those.
      const structured = result.filter((r) => r.Name.includes('-Product '));
      // Choose highest Id among structured (assumes newest/current) else highest Id overall
      const pool = (structured.length > 0 ? structured : result)
        .slice()
        .sort((a, b) => b.Id - a.Id);
      const selected = pool[0];
      const code = selected ? extractCode(selected.Name) : null;
      if (__DEV__) console.debug('🏷️ Selected product option:', selected ? selected.Name : 'none');
      if (__DEV__) console.debug('🏷️ Extracted product code (parsed):', code);
      if (selected && !code) {
        if (__DEV__) console.debug('🏷️ WARNING: Failed to parse product code from option name');
      }
      setProductId(code);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch current product';
      setError(errorMessage);
      if (__DEV__) console.debug('Current product fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId, start, end, enabled]);

  return {
    productId,
    loading,
    error,
    refetch: fetchData,
  };
}
