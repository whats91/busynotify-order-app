import 'server-only';

/*
 * File Context:
 * Purpose: Implements server-side infrastructure for Ecommerce Storefront.
 * Primary Functionality: Owns server-side persistence, schema initialization, or backend data access for this domain.
 * Interlinked With: src/lib/ecommerce-db.ts, src/shared/lib/product-pricing.ts, src/shared/types/index.ts
 * Role: server infrastructure.
 */
import { ecommerceDb } from '@/lib/ecommerce-db';
import { resolveProductPricing } from '@/shared/lib/product-pricing';
import type {
  ApiProduct,
  Company,
  EcommerceCatalogProduct,
  EcommerceStorefrontContext,
  EcommerceStorefrontPayload,
  EcommerceStorefrontSettings,
  UpdateEcommerceStorefrontPayload,
} from '@/shared/types';

interface ExternalApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

interface StorefrontContextRow {
  active_company_id: number | bigint | null;
  active_financial_year: string | null;
  updated_at: string | null;
}

interface StorefrontSettingsRow {
  company_id: number | bigint;
  financial_year: string;
  store_title: string;
  store_subtitle: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_label: string;
  categories_title: string;
  catalog_title: string;
  empty_state_title: string;
  empty_state_description: string;
  checkout_login_title: string;
  checkout_login_description: string;
  footer_note: string;
  updated_at: string;
}

interface PublicStorefrontOptions {
  page?: number;
  searchQuery?: string;
  selectedCategory?: string;
}

declare global {
  var busyNotifyEcommerceDbInitialized: Promise<void> | undefined;
}

const STOREFRONT_PAGE_SIZE = 30;

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJsonSafely<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isApiSuccess<T>(payload: ExternalApiResponse<T> | null): payload is ExternalApiResponse<T> & {
  success: true;
  data: T;
} {
  return Boolean(payload?.success === true && payload.data !== undefined);
}

function normalizeExternalCompany(value: Record<string, unknown>): Company | null {
  const companyId = toNumber(value.companyId ?? value.company_id, NaN);
  const companyName = toText(value.companyName ?? value.company_name);
  const financialYear = toText(value.financialYear ?? value.financial_year);
  const erpCode = toText(value.erpCode ?? value.erp_code ?? value.companyCode ?? value.company_code);

  if (!Number.isFinite(companyId) || companyId <= 0 || !companyName || !financialYear) {
    return null;
  }

  return {
    companyId,
    companyName,
    financialYear,
    erpCode,
  };
}

function normalizeExternalProduct(value: Record<string, unknown>): ApiProduct | null {
  const productId = toNumber(value.product_id, NaN);
  const productName = toText(value.product_name);

  if (!Number.isFinite(productId) || productId <= 0 || !productName) {
    return null;
  }

  return {
    product_id: productId,
    product_name: productName,
    product_alias: toText(value.product_alias),
    product_print_name: toText(value.product_print_name),
    product_sales_price: toNumber(value.product_sales_price, 0),
    product_purchase_price: toNumber(value.product_purchase_price, 0),
    product_mrp: toNumber(value.product_mrp, 0),
    product_group_name: toText(value.product_group_name),
    product_group_id: toNumber(value.product_group_id, 0),
    product_unit: toText(value.product_unit),
    product_mc_name: toText(value.product_mc_name) || null,
    product_mc_code: toNumber(value.product_mc_code, 0),
    product_tax_name: toText(value.product_tax_name),
    product_tax_id: toNumber(value.product_tax_id, 0),
    product_hsn_code: toText(value.product_hsn_code),
    product_tax_rate: toNumber(value.product_tax_rate, 0),
    product_stock: toNumber(value.product_stock, 0),
    product_price: toNumber(value.product_price, 0),
    product_sales_discount: toNumber(value.product_sales_discount, 0),
    product_sales_markup: toNumber(value.product_sales_markup, 0),
    product_purchase_discount: toNumber(value.product_purchase_discount, 0),
    product_description_line1: toText(value.product_description_line1) || null,
    product_description_line2: toText(value.product_description_line2) || null,
    product_description_line3: toText(value.product_description_line3) || null,
    product_description_line4: toText(value.product_description_line4) || null,
    product_created_by: toText(value.product_created_by),
    product_creation_time: toText(value.product_creation_time),
    product_modified_by: toText(value.product_modified_by),
    product_modification_time: toText(value.product_modification_time),
  };
}

function buildDefaultStorefrontSettings(
  companyId: number,
  financialYear: string,
  companyName = 'Busy Notify Store'
): EcommerceStorefrontSettings {
  return {
    companyId,
    financialYear,
    storeTitle: companyName,
    storeSubtitle: `Shop directly from ${companyName}.`,
    heroTitle: `${companyName} Online Store`,
    heroSubtitle: 'Browse products, compare pricing, and add items to your cart before checkout.',
    heroCtaLabel: 'Shop Now',
    categoriesTitle: 'Browse Categories',
    catalogTitle: 'All Products',
    emptyStateTitle: 'No products available',
    emptyStateDescription: 'There are no products available for this storefront yet.',
    checkoutLoginTitle: 'Login required',
    checkoutLoginDescription: 'Please login to continue to checkout. Your cart will stay saved in this browser.',
    footerNote: `${companyName} storefront powered by Busy Notify.`,
  };
}

function mapStorefrontSettingsRow(row: StorefrontSettingsRow): EcommerceStorefrontSettings {
  return {
    companyId: toNumber(row.company_id),
    financialYear: row.financial_year,
    storeTitle: row.store_title,
    storeSubtitle: row.store_subtitle,
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    heroCtaLabel: row.hero_cta_label,
    categoriesTitle: row.categories_title,
    catalogTitle: row.catalog_title,
    emptyStateTitle: row.empty_state_title,
    emptyStateDescription: row.empty_state_description,
    checkoutLoginTitle: row.checkout_login_title,
    checkoutLoginDescription: row.checkout_login_description,
    footerNote: row.footer_note,
    updatedAt: row.updated_at,
  };
}

function createContextFromCompany(
  company: Company | null,
  updatedAt?: string
): EcommerceStorefrontContext | null {
  if (!company) {
    return null;
  }

  return {
    companyId: company.companyId,
    financialYear: company.financialYear,
    companyName: company.companyName,
    erpCode: company.erpCode,
    updatedAt,
  };
}

function mapProductToCatalog(apiProduct: ApiProduct): EcommerceCatalogProduct {
  const pricing = resolveProductPricing(apiProduct);

  return {
    productId: String(apiProduct.product_id),
    name: apiProduct.product_name,
    alias: apiProduct.product_alias || undefined,
    printName: apiProduct.product_print_name || undefined,
    groupName: apiProduct.product_group_name || 'General',
    price: pricing.price,
    salesPrice: pricing.salesPrice,
    mrp: pricing.mrp,
    stock: apiProduct.product_stock,
    unit: apiProduct.product_unit,
    taxRate: apiProduct.product_tax_rate,
    taxName: apiProduct.product_tax_name,
    hsnCode: apiProduct.product_hsn_code,
  };
}

function sortCatalogProducts(products: EcommerceCatalogProduct[]): EcommerceCatalogProduct[] {
  return [...products].sort((left, right) => left.name.localeCompare(right.name));
}

function deriveCategories(products: EcommerceCatalogProduct[]): string[] {
  return [...new Set(products.map((product) => product.groupName.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right)
  );
}

function filterCatalogProducts(
  products: EcommerceCatalogProduct[],
  searchQuery: string,
  selectedCategory: string
) {
  const normalizedSearch = toText(searchQuery).toLowerCase();
  const normalizedCategory = toText(selectedCategory).toLowerCase();

  return products.filter((product) => {
    const categoryMatches =
      !normalizedCategory ||
      normalizedCategory === 'all' ||
      product.groupName.trim().toLowerCase() === normalizedCategory;

    if (!categoryMatches) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      product.name,
      product.alias || '',
      product.printName || '',
      product.groupName,
      product.hsnCode,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch);
  });
}

function clampPage(page: number, totalPages: number) {
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.min(Math.trunc(page), totalPages);
}

function createEmptyPagination() {
  return {
    currentPage: 1,
    pageSize: STOREFRONT_PAGE_SIZE,
    totalPages: 1,
    totalItems: 0,
    startIndex: 0,
    endIndex: 0,
  };
}

async function initializeSchema() {
  if (!global.busyNotifyEcommerceDbInitialized) {
    global.busyNotifyEcommerceDbInitialized = (async () => {
      await ecommerceDb.$queryRawUnsafe('PRAGMA journal_mode = WAL');
      await ecommerceDb.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      await ecommerceDb.$executeRawUnsafe('PRAGMA synchronous = NORMAL');
      await ecommerceDb.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS ecommerce_storefront_context (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          active_company_id INTEGER,
          active_financial_year TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL
        )`
      );
      await ecommerceDb.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS ecommerce_storefront_settings (
          company_id INTEGER NOT NULL,
          financial_year TEXT NOT NULL,
          store_title TEXT NOT NULL DEFAULT '',
          store_subtitle TEXT NOT NULL DEFAULT '',
          hero_title TEXT NOT NULL DEFAULT '',
          hero_subtitle TEXT NOT NULL DEFAULT '',
          hero_cta_label TEXT NOT NULL DEFAULT '',
          categories_title TEXT NOT NULL DEFAULT '',
          catalog_title TEXT NOT NULL DEFAULT '',
          empty_state_title TEXT NOT NULL DEFAULT '',
          empty_state_description TEXT NOT NULL DEFAULT '',
          checkout_login_title TEXT NOT NULL DEFAULT '',
          checkout_login_description TEXT NOT NULL DEFAULT '',
          footer_note TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL,
          PRIMARY KEY (company_id, financial_year)
        )`
      );
      await ecommerceDb.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_ecommerce_storefront_settings_updated_at
         ON ecommerce_storefront_settings(updated_at DESC)`
      );
    })();
  }

  await global.busyNotifyEcommerceDbInitialized;
}

export function isEcommerceEnabled() {
  return process.env.ECOMMERCE?.trim() === '1';
}

async function fetchCompaniesFromBusyApi(): Promise<Company[]> {
  const apiBaseUrl = process.env.API_BASE_URL;
  const authToken = process.env.API_AUTH_TOKEN;

  if (!apiBaseUrl || !authToken) {
    throw new Error('API configuration missing');
  }

  const response = await fetch(`${apiBaseUrl}/companies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      authToken,
    }),
    cache: 'no-store',
  });

  const rawResponse = await response.text();
  const payload = parseJsonSafely<ExternalApiResponse<Record<string, unknown>[]>>(rawResponse);

  if (!response.ok || !isApiSuccess(payload) || !Array.isArray(payload.data)) {
    throw new Error(payload?.error || 'Failed to fetch companies');
  }

  return payload.data
    .map((company) => normalizeExternalCompany(company))
    .filter((company): company is Company => Boolean(company))
    .sort((left, right) => left.companyName.localeCompare(right.companyName));
}

async function fetchProductsFromBusyApi(
  companyId: number,
  financialYear: string
): Promise<ApiProduct[]> {
  const apiBaseUrl = process.env.API_BASE_URL;
  const authToken = process.env.API_AUTH_TOKEN;

  if (!apiBaseUrl || !authToken) {
    throw new Error('API configuration missing');
  }

  const response = await fetch(`${apiBaseUrl}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      authToken,
      companyId,
      financialYear,
    }),
    cache: 'no-store',
  });

  const rawResponse = await response.text();
  const payload = parseJsonSafely<ExternalApiResponse<Record<string, unknown>[]>>(rawResponse);

  if (!response.ok || !isApiSuccess(payload) || !Array.isArray(payload.data)) {
    throw new Error(payload?.error || 'Failed to fetch products');
  }

  return payload.data
    .map((product) => normalizeExternalProduct(product))
    .filter((product): product is ApiProduct => Boolean(product));
}

export async function getAvailableStorefrontCompanies(): Promise<Company[]> {
  return fetchCompaniesFromBusyApi();
}

export async function getStoredEcommerceStorefrontContext(): Promise<EcommerceStorefrontContext | null> {
  await initializeSchema();

  const rows = await ecommerceDb.$queryRawUnsafe<StorefrontContextRow[]>(
    `SELECT active_company_id, active_financial_year, updated_at
     FROM ecommerce_storefront_context
     WHERE id = 1`
  );

  const row = rows[0];

  if (!row || row.active_company_id == null || !toText(row.active_financial_year)) {
    return null;
  }

  const companies = await fetchCompaniesFromBusyApi();
  const company = companies.find(
    (item) =>
      item.companyId === toNumber(row.active_company_id) &&
      item.financialYear === toText(row.active_financial_year)
  );

  if (!company) {
    return {
      companyId: toNumber(row.active_company_id),
      financialYear: toText(row.active_financial_year),
      updatedAt: row.updated_at || undefined,
    };
  }

  return createContextFromCompany(company, row.updated_at || undefined);
}

export async function getStoredEcommerceStorefrontSettings(
  companyId: number,
  financialYear: string,
  companyName?: string
): Promise<EcommerceStorefrontSettings> {
  await initializeSchema();

  const rows = await ecommerceDb.$queryRawUnsafe<StorefrontSettingsRow[]>(
    `SELECT company_id, financial_year, store_title, store_subtitle, hero_title, hero_subtitle,
            hero_cta_label, categories_title, catalog_title, empty_state_title,
            empty_state_description, checkout_login_title, checkout_login_description,
            footer_note, updated_at
     FROM ecommerce_storefront_settings
     WHERE company_id = ? AND financial_year = ?`,
    companyId,
    financialYear
  );

  const row = rows[0];
  return row
    ? mapStorefrontSettingsRow(row)
    : buildDefaultStorefrontSettings(companyId, financialYear, companyName);
}

async function buildCatalogProducts(
  companyId: number,
  financialYear: string
): Promise<EcommerceCatalogProduct[]> {
  const products = await fetchProductsFromBusyApi(companyId, financialYear);
  return sortCatalogProducts(products.map((product) => mapProductToCatalog(product)));
}

async function upsertStorefrontContext(companyId: number, financialYear: string) {
  await initializeSchema();

  const updatedAt = new Date().toISOString();

  await ecommerceDb.$executeRawUnsafe(
    `INSERT INTO ecommerce_storefront_context (
      id,
      active_company_id,
      active_financial_year,
      updated_at
    ) VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      active_company_id = excluded.active_company_id,
      active_financial_year = excluded.active_financial_year,
      updated_at = excluded.updated_at`,
    companyId,
    financialYear,
    updatedAt
  );

  return updatedAt;
}

async function upsertStorefrontSettings(
  payload: UpdateEcommerceStorefrontPayload
): Promise<EcommerceStorefrontSettings> {
  await initializeSchema();

  const updatedAt = new Date().toISOString();

  await ecommerceDb.$executeRawUnsafe(
    `INSERT INTO ecommerce_storefront_settings (
      company_id,
      financial_year,
      store_title,
      store_subtitle,
      hero_title,
      hero_subtitle,
      hero_cta_label,
      categories_title,
      catalog_title,
      empty_state_title,
      empty_state_description,
      checkout_login_title,
      checkout_login_description,
      footer_note,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(company_id, financial_year) DO UPDATE SET
      store_title = excluded.store_title,
      store_subtitle = excluded.store_subtitle,
      hero_title = excluded.hero_title,
      hero_subtitle = excluded.hero_subtitle,
      hero_cta_label = excluded.hero_cta_label,
      categories_title = excluded.categories_title,
      catalog_title = excluded.catalog_title,
      empty_state_title = excluded.empty_state_title,
      empty_state_description = excluded.empty_state_description,
      checkout_login_title = excluded.checkout_login_title,
      checkout_login_description = excluded.checkout_login_description,
      footer_note = excluded.footer_note,
      updated_at = excluded.updated_at`,
    payload.companyId,
    payload.financialYear,
    payload.storeTitle.trim(),
    payload.storeSubtitle.trim(),
    payload.heroTitle.trim(),
    payload.heroSubtitle.trim(),
    payload.heroCtaLabel.trim(),
    payload.categoriesTitle.trim(),
    payload.catalogTitle.trim(),
    payload.emptyStateTitle.trim(),
    payload.emptyStateDescription.trim(),
    payload.checkoutLoginTitle.trim(),
    payload.checkoutLoginDescription.trim(),
    payload.footerNote.trim(),
    updatedAt
  );

  const companies = await fetchCompaniesFromBusyApi();
  const companyName =
    companies.find(
      (company) =>
        company.companyId === payload.companyId &&
        company.financialYear === payload.financialYear
    )?.companyName || undefined;

  return getStoredEcommerceStorefrontSettings(
    payload.companyId,
    payload.financialYear,
    companyName
  );
}

export async function saveEcommerceStorefront(
  payload: UpdateEcommerceStorefrontPayload
): Promise<EcommerceStorefrontPayload> {
  const companies = await fetchCompaniesFromBusyApi();
  const selectedCompany =
    companies.find(
      (company) =>
        company.companyId === payload.companyId &&
        company.financialYear === payload.financialYear
    ) || null;

  await upsertStorefrontContext(payload.companyId, payload.financialYear);
  const settings = await upsertStorefrontSettings(payload);

  return {
    isEnabled: isEcommerceEnabled(),
    activeContext: createContextFromCompany(selectedCompany),
    selectedContext: createContextFromCompany(selectedCompany),
    settings,
    products: [],
    categories: [],
    filters: {
      searchQuery: '',
      selectedCategory: 'all',
    },
    pagination: createEmptyPagination(),
  };
}

export async function getAdminEcommerceStorefront(
  requestedCompanyId?: number,
  requestedFinancialYear?: string
): Promise<EcommerceStorefrontPayload> {
  const companies = await fetchCompaniesFromBusyApi();
  const activeContext = await getStoredEcommerceStorefrontContext();

  const selectedCompany =
    companies.find(
      (company) =>
        company.companyId === requestedCompanyId &&
        company.financialYear === requestedFinancialYear
    ) ||
    companies.find(
      (company) =>
        company.companyId === activeContext?.companyId &&
        company.financialYear === activeContext.financialYear
    ) ||
    null;

  const settings = selectedCompany
    ? await getStoredEcommerceStorefrontSettings(
        selectedCompany.companyId,
        selectedCompany.financialYear,
        selectedCompany.companyName
      )
    : null;

  return {
    isEnabled: isEcommerceEnabled(),
    activeContext,
    selectedContext: createContextFromCompany(selectedCompany),
    settings,
    products: [],
    categories: [],
    filters: {
      searchQuery: '',
      selectedCategory: 'all',
    },
    pagination: createEmptyPagination(),
  };
}

export async function getPublicEcommerceStorefrontPayload(
  options: PublicStorefrontOptions = {}
): Promise<EcommerceStorefrontPayload> {
  if (!isEcommerceEnabled()) {
    return {
      isEnabled: false,
      activeContext: null,
      selectedContext: null,
      settings: null,
      products: [],
      categories: [],
      filters: {
        searchQuery: '',
        selectedCategory: 'all',
      },
      pagination: createEmptyPagination(),
    };
  }

  try {
    const activeContext = await getStoredEcommerceStorefrontContext();

    if (!activeContext?.companyId || !activeContext.financialYear) {
      return {
        isEnabled: true,
        activeContext: null,
        selectedContext: null,
        settings: null,
        products: [],
        categories: [],
        filters: {
          searchQuery: '',
          selectedCategory: 'all',
        },
        pagination: createEmptyPagination(),
        error: 'Storefront unavailable',
      };
    }

    const [settings, products] = await Promise.all([
      getStoredEcommerceStorefrontSettings(
        activeContext.companyId,
        activeContext.financialYear,
        activeContext.companyName
      ),
      buildCatalogProducts(activeContext.companyId, activeContext.financialYear),
    ]);

    const categories = deriveCategories(products);
    const requestedCategory = toText(options.selectedCategory);
    const selectedCategory = categories.some(
      (category) => category.toLowerCase() === requestedCategory.toLowerCase()
    )
      ? categories.find((category) => category.toLowerCase() === requestedCategory.toLowerCase()) ||
        'all'
      : 'all';
    const searchQuery = toText(options.searchQuery);
    const filteredProducts = filterCatalogProducts(products, searchQuery, selectedCategory);
    const totalItems = filteredProducts.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / STOREFRONT_PAGE_SIZE));
    const currentPage = clampPage(options.page ?? 1, totalPages);
    const startOffset = (currentPage - 1) * STOREFRONT_PAGE_SIZE;
    const paginatedProducts = filteredProducts.slice(
      startOffset,
      startOffset + STOREFRONT_PAGE_SIZE
    );
    const startIndex = totalItems > 0 ? startOffset + 1 : 0;
    const endIndex = totalItems > 0 ? startOffset + paginatedProducts.length : 0;

    return {
      isEnabled: true,
      activeContext,
      selectedContext: activeContext,
      settings,
      products: paginatedProducts,
      categories,
      filters: {
        searchQuery,
        selectedCategory,
      },
      pagination: {
        currentPage,
        pageSize: STOREFRONT_PAGE_SIZE,
        totalPages,
        totalItems,
        startIndex,
        endIndex,
      },
    };
  } catch (error) {
    console.error('Failed to load public ecommerce storefront:', error);
    return {
      isEnabled: true,
      activeContext: null,
      selectedContext: null,
      settings: null,
      products: [],
      categories: [],
      filters: {
        searchQuery: '',
        selectedCategory: 'all',
      },
      pagination: createEmptyPagination(),
      error: error instanceof Error ? error.message : 'Failed to load storefront.',
    };
  }
}
