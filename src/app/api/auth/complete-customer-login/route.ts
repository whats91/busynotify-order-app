import { NextRequest, NextResponse } from 'next/server';
import {
  buildCustomerOtpKey,
  createCustomerSession,
  deserializeOtpRecord,
  doesOtpRequestMatch,
  getExpiredOtpCookieOptions,
  getOtpCookieName,
  normalizeWhatsappNumber,
} from '../_lib/customer-otp';
import {
  createPrivateApiSessionCookieValue,
  getPrivateApiSessionCookieName,
  getPrivateApiSessionCookieOptions,
} from '@/app/api/_lib/private-api-session';

export const runtime = 'nodejs';

interface CompleteCustomerLoginBody {
  companyId?: number;
  financialYear?: string;
  whatsappNumber?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CompleteCustomerLoginBody;
    const companyId = Number(body.companyId);
    const financialYear = body.financialYear?.trim();
    const whatsappNumber = normalizeWhatsappNumber(body.whatsappNumber || '');

    if (!companyId || !financialYear || !whatsappNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company, financial year, and WhatsApp number are required.',
        },
        { status: 400 }
      );
    }

    const otpKey = buildCustomerOtpKey(whatsappNumber);
    const otpData = deserializeOtpRecord(request.cookies.get(getOtpCookieName())?.value);

    if (!otpData || !doesOtpRequestMatch(otpData, otpKey) || !otpData.isVerified) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Please verify your OTP before selecting a company.',
        },
        { status: 400 }
      );
      response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());
      return response;
    }

    const companyMatch = otpData.customerCompanies.find(
      (company) =>
        company.companyId === companyId && company.financialYear === financialYear
    );

    if (!companyMatch) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Selected company is not available for this account.',
        },
        { status: 400 }
      );
      response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());
      return response;
    }

    const session = createCustomerSession({
      whatsappNumber,
      customerId: companyMatch.customerId,
      customerName: companyMatch.customerName,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        session,
      },
    });

    const cookieValue = await createPrivateApiSessionCookieValue(
      session.user,
      Math.max(1, session.expiresAt - Date.now())
    );

    response.cookies.set(
      getPrivateApiSessionCookieName(),
      cookieValue,
      getPrivateApiSessionCookieOptions(session.expiresAt)
    );
    response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());

    return response;
  } catch (error) {
    console.error('Customer login completion error:', error);
    const response = NextResponse.json(
      {
        success: false,
        error: 'Unable to complete customer login.',
      },
      { status: 500 }
    );
    response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());
    return response;
  }
}
