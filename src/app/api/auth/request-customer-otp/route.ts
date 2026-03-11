import { NextRequest, NextResponse } from 'next/server';
import {
  createOtpRecord,
  findCustomerCompanies,
  generateOtp,
  getExpiredOtpCookieOptions,
  getOtpCookieName,
  getOtpCookieOptions,
  getOtpExpiryMinutes,
  maskWhatsappNumber,
  normalizeWhatsappNumber,
  sendOtpMessage,
  serializeOtpRecord,
} from '../_lib/customer-otp';

export const runtime = 'nodejs';

interface RequestCustomerOtpBody {
  whatsappNumber?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestCustomerOtpBody;
    const whatsappNumber = normalizeWhatsappNumber(body.whatsappNumber || '');

    if (!whatsappNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'WhatsApp number is required.',
        },
        { status: 400 }
      );
    }

    const companyMatches = await findCustomerCompanies(whatsappNumber);

    if (!companyMatches.success) {
      return NextResponse.json(
        {
          success: false,
          error: companyMatches.error || 'Failed to validate WhatsApp number.',
        },
        { status: 502 }
      );
    }

    if (companyMatches.matches.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'This WhatsApp number is not registered with any company.',
        },
        { status: 400 }
      );
    }

    const otp = generateOtp();
    const otpRecord = createOtpRecord(whatsappNumber, otp, companyMatches.matches);
    const otpResult = await sendOtpMessage(whatsappNumber, otp);

    if (!otpResult.success) {
      const response = NextResponse.json(
        {
          success: false,
          error: otpResult.error || 'Failed to send OTP.',
        },
        { status: 502 }
      );
      response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());
      return response;
    }

    const response = NextResponse.json({
      success: true,
      data: {
        whatsappNumber,
        maskedWhatsappNumber: maskWhatsappNumber(whatsappNumber),
        expiresInMinutes: getOtpExpiryMinutes(),
        companyCount: companyMatches.matches.length,
      },
    });

    response.cookies.set(
      getOtpCookieName(),
      serializeOtpRecord(otpRecord),
      getOtpCookieOptions(otpRecord.expiryAt)
    );

    return response;
  } catch (error) {
    console.error('Customer OTP request error:', error);
    const response = NextResponse.json(
      {
        success: false,
        error: 'Unable to process customer OTP request.',
      },
      { status: 500 }
    );
    response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());
    return response;
  }
}
