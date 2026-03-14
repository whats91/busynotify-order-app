/*
 * File Context:
 * Purpose: Defines the project file for Customer Otp.
 * Primary Functionality: Provides file-specific behavior or configuration for the surrounding project module.
 * Interlinked With: src/shared/types/index.ts
 * Role: authentication backend.
 */
// =====================================================
// CUSTOMER OTP HELPERS - Validation, OTP persistence, and session creation
// =====================================================

import { createHmac, randomUUID } from 'crypto';
import type {
  AuthSession,
  Company,
  CustomerCompanyAccessPayload,
  CustomerCompanyMatch,
  CustomerIdentity,
  User,
} from '@/shared/types';
import { PRIVATE_API_SESSION_DURATION_MS } from '@/app/api/_lib/private-api-session';

interface OtpRecord {
  key: string;
  otpHash: string;
  expiryAt: number;
  attempts: number;
  isVerified: boolean;
  customerCompanies: CustomerCompanyMatch[];
}

interface SendOtpResult {
  success: boolean;
  error?: string;
  details?: unknown;
}

interface ValidateWhatsappResult {
  success: boolean;
  isValid: boolean;
  error?: string;
  customerId?: string;
  customerName?: string;
}

interface FindCustomerCompaniesResult {
  success: boolean;
  matches: CustomerCompanyMatch[];
  error?: string;
}

interface CompaniesApiResponse {
  success?: boolean;
  error?: string;
  data?: Company[];
}

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 3;
const OTP_COOKIE_NAME = 'busy-notify-customer-otp';

export function normalizeWhatsappNumber(value: string): string {
  return value.replace(/[^\d]/g, '');
}

export function maskWhatsappNumber(value: string): string {
  if (value.length <= 4) {
    return value;
  }

  return `${value.slice(0, 2)}${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-2)}`;
}

export function buildCustomerOtpKey(whatsappNumber: string): string {
  return normalizeWhatsappNumber(whatsappNumber);
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getOtpSecret(): string {
  return process.env.JWT_SECRET || process.env.API_AUTH_TOKEN || 'busy-notify-otp';
}

function hashOtp(otp: string): string {
  return createHmac('sha256', getOtpSecret()).update(otp).digest('hex');
}

export function createOtpRecord(
  whatsappNumber: string,
  otp: string,
  customerCompanies: CustomerCompanyMatch[]
): OtpRecord {
  return {
    key: buildCustomerOtpKey(whatsappNumber),
    otpHash: hashOtp(otp),
    expiryAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    attempts: 0,
    isVerified: false,
    customerCompanies,
  };
}

export function serializeOtpRecord(record: OtpRecord): string {
  return Buffer.from(JSON.stringify(record)).toString('base64url');
}

export function deserializeOtpRecord(value?: string): OtpRecord | null {
  if (!value) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<OtpRecord>;

    if (
      typeof parsed.key !== 'string' ||
      typeof parsed.otpHash !== 'string' ||
      typeof parsed.expiryAt !== 'number' ||
      typeof parsed.attempts !== 'number' ||
      typeof parsed.isVerified !== 'boolean' ||
      !Array.isArray(parsed.customerCompanies)
    ) {
      return null;
    }

    const customerCompanies = parsed.customerCompanies.filter(
      (company): company is CustomerCompanyMatch =>
        typeof company?.companyId === 'number' &&
        typeof company?.companyName === 'string' &&
        typeof company?.financialYear === 'string' &&
        typeof company?.erpCode === 'string' &&
        typeof company?.customerId === 'string' &&
        typeof company?.customerName === 'string'
    );

    return {
      key: parsed.key,
      otpHash: parsed.otpHash,
      expiryAt: parsed.expiryAt,
      attempts: parsed.attempts,
      isVerified: parsed.isVerified,
      customerCompanies,
    };
  } catch (error) {
    console.error('OTP cookie parsing error:', error);
    return null;
  }
}

export function incrementOtpAttempts(otpData: OtpRecord): OtpRecord {
  return {
    ...otpData,
    attempts: otpData.attempts + 1,
  };
}

export function markOtpRecordVerified(otpData: OtpRecord): OtpRecord {
  return {
    ...otpData,
    isVerified: true,
  };
}

export function isOtpExpired(otpData: OtpRecord): boolean {
  return Date.now() > otpData.expiryAt;
}

export function doesOtpRequestMatch(otpData: OtpRecord, key: string): boolean {
  return otpData.key === key;
}

export function isOtpValid(otpData: OtpRecord, otp: string): boolean {
  return otpData.otpHash === hashOtp(otp.trim());
}

export function getMaxOtpAttempts(): number {
  return MAX_OTP_ATTEMPTS;
}

export function getOtpExpiryMinutes(): number {
  return OTP_EXPIRY_MINUTES;
}

export function getOtpCookieName(): string {
  return OTP_COOKIE_NAME;
}

export function getOtpCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  };
}

export function getExpiredOtpCookieOptions() {
  return {
    ...getOtpCookieOptions(Date.now() - 1000),
    maxAge: 0,
  };
}

async function fetchCompanies(): Promise<CompaniesApiResponse> {
  const apiBaseUrl = process.env.API_BASE_URL;
  const authToken = process.env.API_AUTH_TOKEN;

  if (!apiBaseUrl || !authToken) {
    return {
      success: false,
      error: 'API configuration missing',
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authToken,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to fetch companies',
      };
    }

    return (await response.json()) as CompaniesApiResponse;
  } catch (error) {
    console.error('Company fetch error:', error);
    return {
      success: false,
      error: 'Unable to fetch companies',
    };
  }
}

export async function validateWhatsappNumber(
  params: CustomerCompanyAccessPayload
): Promise<ValidateWhatsappResult> {
  const apiBaseUrl = process.env.API_BASE_URL;
  const authToken = process.env.API_AUTH_TOKEN;

  if (!apiBaseUrl || !authToken) {
    return {
      success: false,
      isValid: false,
      error: 'API configuration missing',
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/validate-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authToken,
        companyId: params.companyId,
        financialYear: params.financialYear,
        whatsappNumber: normalizeWhatsappNumber(params.whatsappNumber),
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        success: false,
        isValid: false,
        error: 'Failed to validate WhatsApp number',
      };
    }

    const data = await response.json();

    if (data.success !== true) {
      return {
        success: false,
        isValid: false,
        error: data.error || 'WhatsApp validation failed',
      };
    }

    return {
      success: true,
      isValid: data.data === true,
      customerId:
        data.data === true && data.metadata?.customerId != null
          ? String(data.metadata.customerId)
          : undefined,
      customerName:
        data.data === true && typeof data.metadata?.customerName === 'string'
          ? data.metadata.customerName
          : undefined,
    };
  } catch (error) {
    console.error('WhatsApp validation error:', error);
    return {
      success: false,
      isValid: false,
      error: 'Unable to validate WhatsApp number',
    };
  }
}

export async function findCustomerCompanies(
  whatsappNumber: string
): Promise<FindCustomerCompaniesResult> {
  const companiesResponse = await fetchCompanies();

  if (companiesResponse.success !== true || !Array.isArray(companiesResponse.data)) {
    return {
      success: false,
      matches: [],
      error: companiesResponse.error || 'Failed to fetch companies.',
    };
  }

  const companies = companiesResponse.data;

  if (companies.length === 0) {
    return {
      success: false,
      matches: [],
      error: 'No companies available for validation.',
    };
  }

  const validationResults = await Promise.allSettled(
    companies.map(async (company) => {
      const result = await validateWhatsappNumber({
        companyId: company.companyId,
        financialYear: company.financialYear,
        whatsappNumber,
      });

      return {
        company,
        result,
      };
    })
  );

  const matches = validationResults.flatMap((validationResult) => {
    if (validationResult.status !== 'fulfilled') {
      return [];
    }

    const { company, result } = validationResult.value;

    if (!result.success || !result.isValid || !result.customerId || !result.customerName) {
      return [];
    }

    return [
      {
        ...company,
        customerId: result.customerId,
        customerName: result.customerName,
      },
    ];
  });

  const successfulChecks = validationResults.filter(
    (validationResult) =>
      validationResult.status === 'fulfilled' &&
      validationResult.value.result.success
  ).length;

  if (successfulChecks === 0) {
    return {
      success: false,
      matches: [],
      error: 'Unable to validate your WhatsApp number against available companies.',
    };
  }

  return {
    success: true,
    matches,
  };
}

export async function sendOtpMessage(recipientPhone: string, otp: string): Promise<SendOtpResult> {
  const senderId = process.env.WHATSAPP_SENDER_ID;
  const authToken = process.env.WHATSAPP_AUTH_TOKEN;
  const channel = process.env.WHATSAPP_CHANNEL;
  const templateName = process.env.TEMPLATE_NAME || 'busy_notify_otp';
  const apiUrl =
    process.env.WHATSAPP_TEMPLATE_API_URL ||
    'https://rest.botmastersender.com/public/send-template-direct-to-meta';

  if (!senderId || !authToken || !channel) {
    return {
      success: false,
      error: 'OTP service configuration incomplete',
    };
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: normalizeWhatsappNumber(recipientPhone),
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: 'en_US',
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: otp,
            },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [
            {
              type: 'text',
              text: otp,
            },
          ],
        },
      ],
    },
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await response.json();

    if (
      response.ok &&
      ((Array.isArray(data.messages) && data.messages.length > 0) ||
        data.success === true ||
        data.status === 'success')
    ) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Failed to send OTP',
      details: data,
    };
  } catch (error) {
    console.error('OTP sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP',
    };
  }
}

interface CreateCustomerSessionParams extends CustomerIdentity {
  whatsappNumber: string;
}

export function createCustomerSession(params: CreateCustomerSessionParams): AuthSession {
  const normalizedPhone = normalizeWhatsappNumber(params.whatsappNumber);

  const user: User = {
    id: params.customerId,
    username: normalizedPhone,
    name: params.customerName,
    role: 'customer',
    phone: normalizedPhone,
  };

  return {
    user,
    token: `customer_session_${randomUUID()}`,
    expiresAt: Date.now() + PRIVATE_API_SESSION_DURATION_MS,
  };
}
