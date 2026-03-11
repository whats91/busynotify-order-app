// =====================================================
// WHITE-LABEL CONFIGURATION - Brand & Features
// This configuration can be customized per tenant/version
// =====================================================

import type { WhiteLabelConfig, BrandConfig, FeatureFlags } from '../types';

// =====================================================
// BRAND CONFIGURATION
// Customize these values for white-labeling
// =====================================================

export const defaultBrandConfig: BrandConfig = {
  name: 'Busy Notify',
  tagline: 'Internal Ordering Portal',
  logo: '/logo.svg',
  logoDark: '/logo.svg',
  favicon: '/favicon.ico',
  primaryColor: '#10B981', // emerald-500
  secondaryColor: '#6366F1', // indigo-500
  accentColor: '#F59E0B', // amber-500
  companyName: 'Busy Notify Pvt. Ltd.',
  supportEmail: 'support@busynotify.com',
  supportPhone: '+91 98765 43210',
  defaultLanguage: 'en',
  currency: 'INR',
  currencySymbol: '₹',
};

// =====================================================
// FEATURE FLAGS
// Enable/disable features per deployment
// =====================================================

export const defaultFeatureFlags: FeatureFlags = {
  enableCart: true,
  enableOrderHistory: true,
  enableCustomerSearch: true,
  enableProductCategories: true,
  enableTaxCalculation: true,
  enableOrderNotes: true,
  maxCartItems: 50,
};

// =====================================================
// VERSION-SPECIFIC CONFIGURATION
// Can be extended per version
// =====================================================

export const versionConfig = {
  v1: {
    versionName: 'Version 1.0',
    releaseDate: '2024-01-01',
    features: defaultFeatureFlags,
  },
  v2: {
    versionName: 'Version 2.0',
    releaseDate: '2024-06-01',
    features: defaultFeatureFlags,
  },
};

// =====================================================
// CURRENT VERSION CONFIGURATION
// Change this to switch between versions
// =====================================================

export const CURRENT_VERSION = 'v1';

// =====================================================
// COMPLETE WHITE-LABEL CONFIG
// =====================================================

export const defaultWhiteLabelConfig: WhiteLabelConfig = {
  brand: defaultBrandConfig,
  features: defaultFeatureFlags,
  version: CURRENT_VERSION,
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getWhiteLabelConfig(tenantId?: string): WhiteLabelConfig {
  // In future, this can load tenant-specific config
  // For Phase 1, return default config
  return {
    ...defaultWhiteLabelConfig,
    tenantId,
  };
}

export function getBrandConfig(): BrandConfig {
  return defaultBrandConfig;
}

export function getFeatureFlags(): FeatureFlags {
  return defaultFeatureFlags;
}

export function getCurrencySymbol(): string {
  return defaultBrandConfig.currencySymbol;
}

export function formatCurrency(amount: number): string {
  return `${defaultBrandConfig.currencySymbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
