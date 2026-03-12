/*
 * File Context:
 * Purpose: Defines the project file for Customers.
 * Primary Functionality: Provides file-specific behavior or configuration for the surrounding project module.
 * Interlinked With: src/shared/types/index.ts
 * Role: application data/service layer.
 */
// =====================================================
// MOCK DATA - Customers
// =====================================================

import type { Customer, CustomerSummary } from '../../../shared/types';

export const mockCustomers: Customer[] = [
  {
    id: 'cust_001',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    phone: '+91 98765 01001',
    address: '123, MG Road, Sector 15',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122001',
    gstNumber: '06AACCU4606F1ZV',
    creditLimit: 100000,
    outstandingBalance: 25000,
  },
  {
    id: 'cust_002',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '+91 98765 01002',
    address: '456, Park Street, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400053',
    gstNumber: '27AACCU4606F1ZM',
    creditLimit: 150000,
    outstandingBalance: 45000,
  },
  {
    id: 'cust_003',
    name: 'Amit Kumar',
    email: 'amit.kumar@example.com',
    phone: '+91 98765 01003',
    address: '789, Connaught Place, Block A',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    gstNumber: '07AACCU4606F1ZD',
    creditLimit: 200000,
    outstandingBalance: 80000,
  },
  {
    id: 'cust_004',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@example.com',
    phone: '+91 98765 01004',
    address: '321, Banjara Hills, Road 10',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
    gstNumber: '36AACCU4606F1ZH',
    creditLimit: 120000,
    outstandingBalance: 15000,
  },
  {
    id: 'cust_005',
    name: 'Vijay Menon',
    email: 'vijay.menon@example.com',
    phone: '+91 98765 01005',
    address: '555, Anna Nagar, 2nd Street',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600040',
    gstNumber: '33AACCU4606F1ZT',
    creditLimit: 80000,
    outstandingBalance: 5000,
  },
  {
    id: 'cust_006',
    name: 'Deepak Verma',
    email: 'deepak.verma@example.com',
    phone: '+91 98765 01006',
    address: '888, Sector 22, DLF Phase 3',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122002',
    creditLimit: 50000,
    outstandingBalance: 0,
  },
  {
    id: 'cust_007',
    name: 'Kavita Joshi',
    email: 'kavita.joshi@example.com',
    phone: '+91 98765 01007',
    address: '999, Koregaon Park, Lane 5',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    gstNumber: '27AACCU4606F1ZP',
    creditLimit: 175000,
    outstandingBalance: 95000,
  },
  {
    id: 'cust_008',
    name: 'Ravi Shankar',
    email: 'ravi.shankar@example.com',
    phone: '+91 98765 01008',
    address: '111, Salt Lake, Sector V',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700091',
    gstNumber: '19AACCU4606F1ZW',
    creditLimit: 90000,
    outstandingBalance: 35000,
  },
];

// Get all customers
export function getAllCustomers(): Customer[] {
  return mockCustomers;
}

// Get customer by ID
export function getCustomerById(id: string): Customer | undefined {
  return mockCustomers.find(c => c.id === id);
}

// Get customer summaries (lighter weight)
export function getCustomerSummaries(): CustomerSummary[] {
  return mockCustomers.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    city: c.city,
  }));
}

// Search customers
export function searchCustomers(query: string): Customer[] {
  const lowerQuery = query.toLowerCase();
  return mockCustomers.filter(
    c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.phone.includes(query) ||
      c.city.toLowerCase().includes(lowerQuery)
  );
}
