// =====================================================
// SHARED TYPES - Core Domain Models
// These types are shared across all versions
// =====================================================

// ==================== USER & AUTH ====================

export type Role = 'admin' | 'customer' | 'salesman';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface CustomerOtpRequestPayload {
  whatsappNumber: string;
}

export interface CustomerOtpVerifyPayload extends CustomerOtpRequestPayload {
  otp: string;
}

export interface CustomerIdentity {
  customerId: string;
  customerName: string;
}

export interface CustomerCompanyAccessPayload extends CustomerOtpRequestPayload {
  companyId: number;
  financialYear: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

// ==================== COMPANY ====================

export interface Company {
  companyId: number;
  companyName: string;
  financialYear: string;
  erpCode: string;
}

export interface CustomerCompanyMatch extends Company, CustomerIdentity {}

export interface CompanyApiResponse {
  success: boolean;
  data: Company[];
  metadata: {
    rowCount: number;
    executedAt: string;
  };
}

export interface CustomerListRequest {
  companyId: number;
  financialYear: string;
}

// ==================== CUSTOMER ====================

export interface ApiCustomer {
  customer_id: number;
  customer_name: string;
  group_id: number;
  group_name: string;
  mobile_number: string;
  whatsapp_number: string;
  address_line_1: string;
  address_line_2: string;
  address_line_3: string;
  address_line_4: string;
  pin_code: string;
  country: string;
  state: string;
  gst_number: string;
  pan_number: string;
  station: string;
  opening_balance: number;
  balance: number;
  closing_balance: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  groupName?: string;
  gstNumber?: string;
  creditLimit?: number;
  outstandingBalance?: number;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  city: string;
}

export interface CustomerApiResponse {
  success: boolean;
  data: Customer[];
  metadata?: {
    companyId: number;
    companyCode: string;
    financialYear: string;
    rowCount: number;
    executionTime?: string;
    executedAt: string;
  };
}

// ==================== SALE TYPES ====================

export interface ApiSaleType {
  sale_type_id: number;
  sale_type_name: string;
  sale_type_alias: string;
  sale_type_print_name: string;
}

export interface SaleType {
  id: string;
  name: string;
  alias?: string;
  printName?: string;
}

export interface SalesTypeConfig {
  companyId: number;
  financialYear: string;
  companyState: string;
  sameStateSaleTypeId: string;
  sameStateSaleTypeName: string;
  interstateSaleTypeId: string;
  interstateSaleTypeName: string;
  updatedAt?: string;
}

export interface UpdateSalesTypeConfigPayload {
  companyId: number;
  financialYear: string;
  companyState: string;
  sameStateSaleTypeId: string;
  sameStateSaleTypeName: string;
  interstateSaleTypeId: string;
  interstateSaleTypeName: string;
}

export interface SaleTypeApiResponse {
  success: boolean;
  data: SaleType[];
  metadata?: {
    companyId: number;
    companyCode: string;
    financialYear: string;
    rowCount: number;
    executionTime?: string;
    executedAt: string;
  };
}

export interface ApiMaterialCenter {
  mc_id: number;
  mc_name: string;
  mc_alias: string;
  mc_print_name: string;
}

export interface MaterialCenter {
  id: string;
  name: string;
  alias?: string;
  printName?: string;
}

export interface MaterialCenterConfig {
  companyId: number;
  financialYear: string;
  materialCenterId: string;
  materialCenterName: string;
  updatedAt?: string;
}

export interface UpdateMaterialCenterConfigPayload {
  companyId: number;
  financialYear: string;
  materialCenterId: string;
  materialCenterName: string;
}

export interface MaterialCenterApiResponse {
  success: boolean;
  data: MaterialCenter[];
  metadata?: {
    companyId: number;
    companyCode: string;
    financialYear: string;
    rowCount: number;
    executionTime?: string;
    executedAt: string;
  };
}

export interface IndianState {
  code: string;
  name: string;
  type: 'state' | 'union-territory';
}

// ==================== SALESMAN ====================

export interface Salesman {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesmanPayload {
  username: string;
  name: string;
  password: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateSalesmanPayload {
  username?: string;
  name?: string;
  password?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

// ==================== PRODUCT ====================

// Live API Product - Full response from api.busynotify.in
export interface ApiProduct {
  product_id: number;
  product_name: string;
  product_alias: string;
  product_print_name: string;
  product_sales_price: number;
  product_purchase_price: number;
  product_mrp: number;
  product_group_name: string;
  product_group_id: number;
  product_unit: string;
  product_mc_name: string | null;
  product_mc_code: number;
  product_tax_name: string;
  product_tax_id: number;
  product_hsn_code: string;
  product_tax_rate: number;
  product_stock: number;
  product_price: number;
  product_sales_discount: number;
  product_sales_markup: number;
  product_purchase_discount: number;
  product_description_line1: string | null;
  product_description_line2: string | null;
  product_description_line3: string | null;
  product_description_line4: string | null;
  product_created_by: string;
  product_creation_time: string;
  product_modified_by: string;
  product_modification_time: string;
}

// Essential product fields for display (Phase 1)
export interface ProductDisplay {
  id: string;
  productId: number;
  name: string;
  price: number;
  salesPrice: number;
  mrp: number;
  stock: number;
  unit: string;
  taxRate: number;
  taxName: string;
  groupName: string;
  hsnCode: string;
  // Keep reference to full product data
  _fullData?: ApiProduct;
}

export const PRODUCT_FIELD_KEYS = [
  'name',
  'productId',
  'productAlias',
  'printName',
  'unit',
  'price',
  'salesPrice',
  'purchasePrice',
  'mrp',
  'stock',
  'groupName',
  'groupId',
  'mcName',
  'mcCode',
  'taxName',
  'taxId',
  'hsnCode',
  'taxRate',
  'apiPrice',
  'salesDiscount',
  'salesMarkup',
  'purchaseDiscount',
  'descriptionLine1',
  'descriptionLine2',
  'descriptionLine3',
  'descriptionLine4',
  'createdBy',
  'creationTime',
  'modifiedBy',
  'modificationTime',
] as const;

export type ProductFieldKey = (typeof PRODUCT_FIELD_KEYS)[number];

export interface ProductFieldConfig {
  fieldKey: ProductFieldKey;
  label: string;
  description?: string;
  isVisible: boolean;
  sortOrder: number;
}

export interface UpdateProductFieldConfigPayload {
  fieldKey: ProductFieldKey;
  isVisible: boolean;
}

// Legacy Product type (for backward compatibility)
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  unit: string;
  category: string;
  stock: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface ProductApiResponse {
  success: boolean;
  data: ApiProduct[];
  metadata: {
    companyId: number;
    companyCode: string;
    financialYear: string;
    rowCount: number;
    executionTime: string;
    executedAt: string;
  };
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

// ==================== CART ====================

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  customerId?: string; // For salesman mode
  customerName?: string; // For salesman mode
}

// ==================== ORDER ====================

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerState?: string;
  companyState?: string;
  saleTypeId?: string;
  saleTypeName?: string;
  materialCenterId?: string;
  materialCenterName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID who created the order
  createdByRole: Role; // Role of the user who created
  notes?: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  itemCount: number;
}

// ==================== NAVIGATION ====================

export interface NavigationItem {
  id: string;
  labelKey: string; // Translation key
  href?: string;
  icon?: string;
  roles: Role[];
  children?: NavigationItem[];
  badge?: string | number;
}

// ==================== TRANSLATION ====================

export type TranslationKey = string; // Will be typed by translation schema

export interface TranslationSchema {
  common: {
    appName: string;
    loading: string;
    error: string;
    success: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    filter: string;
    clear: string;
    submit: string;
    back: string;
    next: string;
    confirm: string;
    close: string;
    logout: string;
    login: string;
    dashboard: string;
    orders: string;
    orderList: string;
    placeOrder: string;
    cart: string;
    profile: string;
    settings: string;
    language: string;
    english: string;
    hindi: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    username: string;
    password: string;
    rememberMe: string;
    forgotPassword: string;
    loginButton: string;
    invalidCredentials: string;
    welcomeBack: string;
  };
  dashboard: {
    customerTitle: string;
    salesmanTitle: string;
    adminTitle: string;
    welcomeMessage: string;
    quickActions: string;
    recentOrders: string;
    totalOrders: string;
    pendingOrders: string;
    completedOrders: string;
    placeNewOrder: string;
    viewAllOrders: string;
    manageSalesmen: string;
    totalSalesmen: string;
    activeSalesmen: string;
    inactiveSalesmen: string;
  };
  order: {
    title: string;
    selectCustomer: string;
    searchCustomer: string;
    noCustomerSelected: string;
    customerRequiredTitle: string;
    customerRequiredDescription: string;
    loadingCustomers: string;
    noCustomersAvailable: string;
    products: string;
    addToCart: string;
    addedToCart: string;
    outOfStock: string;
    inStock: string;
    quantity: string;
    price: string;
    total: string;
    category: string;
    allCategories: string;
  };
  cart: {
    title: string;
    empty: string;
    items: string;
    removeItem: string;
    clearCart: string;
    subtotal: string;
    tax: string;
    grandTotal: string;
    placeOrder: string;
    orderFor: string;
    yourOrder: string;
    confirmOrder: string;
    orderSuccess: string;
    orderSuccessMessage: string;
  };
  orderList: {
    title: string;
    noOrders: string;
    orderNumber: string;
    customer: string;
    date: string;
    status: string;
    total: string;
    actions: string;
    viewDetails: string;
  };
  navigation: {
    home: string;
    dashboard: string;
    newOrder: string;
    orders: string;
    configuration: string;
    salesmen: string;
    productConfiguration: string;
    salesTypeSettings: string;
    materialCenterConfiguration: string;
    customers: string;
    products: string;
    reports: string;
    settings: string;
  };
}

// ==================== WHITE LABEL / BRAND ====================

export interface BrandConfig {
  name: string;
  tagline?: string;
  logo: string;
  logoDark?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  companyName: string;
  supportEmail?: string;
  supportPhone?: string;
  defaultLanguage: 'en' | 'hi';
  currency: string;
  currencySymbol: string;
}

export interface FeatureFlags {
  enableCart: boolean;
  enableOrderHistory: boolean;
  enableCustomerSearch: boolean;
  enableProductCategories: boolean;
  enableTaxCalculation: boolean;
  enableOrderNotes: boolean;
  maxCartItems?: number;
}

export interface WhiteLabelConfig {
  brand: BrandConfig;
  features: FeatureFlags;
  version: string;
  tenantId?: string; // For future multi-tenant support
}

// ==================== API RESPONSE ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== FILTER TYPES ====================

export interface ProductFilter {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface OrderFilter {
  status?: OrderStatus;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ==================== STATE TYPES ====================

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  language: 'en' | 'hi';
  brandConfig: WhiteLabelConfig | null;
}
