// =====================================================
// MOCK DATA - Products
// =====================================================

import type { Product, ProductCategory } from '../../../shared/types';

export const mockCategories: ProductCategory[] = [
  { id: 'cat_001', name: 'Electronics', description: 'Electronic devices and accessories' },
  { id: 'cat_002', name: 'Office Supplies', description: 'Office stationery and supplies' },
  { id: 'cat_003', name: 'Furniture', description: 'Office and home furniture' },
  { id: 'cat_004', name: 'IT Accessories', description: 'Computer and IT accessories' },
  { id: 'cat_005', name: 'Networking', description: 'Networking equipment' },
];

export const mockProducts: Product[] = [
  // Electronics
  {
    id: 'prod_001',
    sku: 'ELEC-001',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with long battery life',
    price: 899,
    currency: 'INR',
    unit: 'piece',
    category: 'Electronics',
    stock: 150,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_002',
    sku: 'ELEC-002',
    name: 'Bluetooth Keyboard',
    description: 'Full-size wireless keyboard with numeric keypad',
    price: 1499,
    currency: 'INR',
    unit: 'piece',
    category: 'Electronics',
    stock: 85,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_003',
    sku: 'ELEC-003',
    name: 'USB-C Hub',
    description: '7-in-1 USB-C hub with HDMI and card reader',
    price: 2199,
    currency: 'INR',
    unit: 'piece',
    category: 'Electronics',
    stock: 60,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_004',
    sku: 'ELEC-004',
    name: 'Webcam HD 1080p',
    description: 'Full HD webcam with built-in microphone',
    price: 3499,
    currency: 'INR',
    unit: 'piece',
    category: 'Electronics',
    stock: 40,
    imageUrl: undefined,
    isActive: true,
  },
  // Office Supplies
  {
    id: 'prod_005',
    sku: 'OFF-001',
    name: 'A4 Copy Paper (500 sheets)',
    description: 'Premium quality A4 copy paper for printing',
    price: 350,
    currency: 'INR',
    unit: 'ream',
    category: 'Office Supplies',
    stock: 500,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_006',
    sku: 'OFF-002',
    name: 'Ball Pen Pack (10 pcs)',
    description: 'Smooth writing ball pens, pack of 10',
    price: 120,
    currency: 'INR',
    unit: 'pack',
    category: 'Office Supplies',
    stock: 300,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_007',
    sku: 'OFF-003',
    name: 'Stapler with Staples',
    description: 'Heavy-duty stapler with 1000 staples included',
    price: 299,
    currency: 'INR',
    unit: 'piece',
    category: 'Office Supplies',
    stock: 200,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_008',
    sku: 'OFF-004',
    name: 'Desk Organizer',
    description: 'Multi-compartment desk organizer',
    price: 599,
    currency: 'INR',
    unit: 'piece',
    category: 'Office Supplies',
    stock: 120,
    imageUrl: undefined,
    isActive: true,
  },
  // Furniture
  {
    id: 'prod_009',
    sku: 'FRN-001',
    name: 'Ergonomic Office Chair',
    description: 'Adjustable ergonomic chair with lumbar support',
    price: 8999,
    currency: 'INR',
    unit: 'piece',
    category: 'Furniture',
    stock: 25,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_010',
    sku: 'FRN-002',
    name: 'Standing Desk',
    description: 'Height-adjustable standing desk',
    price: 15999,
    currency: 'INR',
    unit: 'piece',
    category: 'Furniture',
    stock: 15,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_011',
    sku: 'FRN-003',
    name: 'Filing Cabinet',
    description: '3-drawer metal filing cabinet',
    price: 4999,
    currency: 'INR',
    unit: 'piece',
    category: 'Furniture',
    stock: 30,
    imageUrl: undefined,
    isActive: true,
  },
  // IT Accessories
  {
    id: 'prod_012',
    sku: 'IT-001',
    name: 'HDMI Cable 2m',
    description: 'High-speed HDMI cable with Ethernet support',
    price: 299,
    currency: 'INR',
    unit: 'piece',
    category: 'IT Accessories',
    stock: 200,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_013',
    sku: 'IT-002',
    name: 'Laptop Stand',
    description: 'Adjustable aluminum laptop stand',
    price: 1299,
    currency: 'INR',
    unit: 'piece',
    category: 'IT Accessories',
    stock: 80,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_014',
    sku: 'IT-003',
    name: 'Mouse Pad Large',
    description: 'Extended gaming mouse pad 90x40cm',
    price: 599,
    currency: 'INR',
    unit: 'piece',
    category: 'IT Accessories',
    stock: 150,
    imageUrl: undefined,
    isActive: true,
  },
  // Networking
  {
    id: 'prod_015',
    sku: 'NET-001',
    name: 'Ethernet Cable Cat6 (5m)',
    description: 'High-speed Cat6 ethernet cable',
    price: 249,
    currency: 'INR',
    unit: 'piece',
    category: 'Networking',
    stock: 250,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_016',
    sku: 'NET-002',
    name: 'WiFi Router Dual Band',
    description: 'AC1200 dual-band wireless router',
    price: 2499,
    currency: 'INR',
    unit: 'piece',
    category: 'Networking',
    stock: 45,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_017',
    sku: 'NET-003',
    name: 'Network Switch 8-Port',
    description: 'Gigabit ethernet switch, 8 ports',
    price: 1299,
    currency: 'INR',
    unit: 'piece',
    category: 'Networking',
    stock: 60,
    imageUrl: undefined,
    isActive: true,
  },
  {
    id: 'prod_018',
    sku: 'NET-004',
    name: 'LAN Tester',
    description: 'Network cable tester for RJ45',
    price: 399,
    currency: 'INR',
    unit: 'piece',
    category: 'Networking',
    stock: 100,
    imageUrl: undefined,
    isActive: true,
  },
];

// Get all products
export function getAllProducts(): Product[] {
  return mockProducts.filter(p => p.isActive);
}

// Get product by ID
export function getProductById(id: string): Product | undefined {
  return mockProducts.find(p => p.id === id);
}

// Get products by category
export function getProductsByCategory(category: string): Product[] {
  return mockProducts.filter(p => p.isActive && p.category === category);
}

// Get all categories
export function getAllCategories(): ProductCategory[] {
  return mockCategories;
}

// Search products
export function searchProducts(query: string, category?: string): Product[] {
  let products = mockProducts.filter(p => p.isActive);
  
  if (category && category !== 'all') {
    products = products.filter(p => p.category === category);
  }
  
  if (query) {
    const lowerQuery = query.toLowerCase();
    products = products.filter(
      p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.sku.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
    );
  }
  
  return products;
}
