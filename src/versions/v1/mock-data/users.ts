// =====================================================
// MOCK DATA - Users (Hardcoded for Phase 1)
// =====================================================

import type { User } from '../../../shared/types';

export const mockUsers: User[] = [
  {
    id: 'usr_001',
    username: 'admin',
    name: 'Admin User',
    role: 'admin',
    email: 'admin@busynotify.com',
    phone: '+91 98765 00001',
  },
  {
    id: 'usr_002',
    username: 'customer',
    name: 'Rahul Sharma',
    role: 'customer',
    email: 'rahul@example.com',
    phone: '+91 98765 00002',
  },
  {
    id: 'usr_003',
    username: 'salesman',
    name: 'Vikram Singh',
    role: 'salesman',
    email: 'vikram@busynotify.com',
    phone: '+91 98765 00003',
  },
];

// Hardcoded credentials (Phase 1 only)
export const mockCredentials: Record<string, string> = {
  admin: 'admin',
  customer: 'customer',
  salesman: 'salesman',
};

// Get user by username
export function getUserByUsername(username: string): User | undefined {
  return mockUsers.find(u => u.username === username);
}

// Validate credentials
export function validateCredentials(username: string, password: string): User | null {
  const storedPassword = mockCredentials[username];
  if (storedPassword && storedPassword === password) {
    return getUserByUsername(username) || null;
  }
  return null;
}
