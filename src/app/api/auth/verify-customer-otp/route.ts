import { NextRequest, NextResponse } from 'next/server';
import {
  buildCustomerOtpKey,
  deserializeOtpRecord,
  doesOtpRequestMatch,
  getExpiredOtpCookieOptions,
  getMaxOtpAttempts,
  getOtpCookieName,
  getOtpCookieOptions,
  incrementOtpAttempts,
  isOtpExpired,
  isOtpValid,
  markOtpRecordVerified,
  normalizeWhatsappNumber,
  serializeOtpRecord,
} from '../_lib/customer-otp';

export const runtime = 'nodejs';

interface VerifyCustomerOtpBody {
  whatsappNumber?: string;
  otp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyCustomerOtpBody;
    const whatsappNumber = normalizeWhatsappNumber(body.whatsappNumber || '');
    const otp = String(body.otp || '').trim();

    if (!whatsappNumber || !otp) {
      return NextResponse.json(
        {
          success: false,
          error: 'WhatsApp number and OTP are required.',
        },
        { status: 400 }
      );
    }

    const otpKey = buildCustomerOtpKey(whatsappNumber);
    const otpData = deserializeOtpRecord(request.cookies.get(getOtpCookieName())?.value);

    if (!otpData || !doesOtpRequestMatch(otpData, otpKey)) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'No OTP request found for this number. Please request a new OTP.',
        },
        { status: 400 }
      );
      response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());
      return response;
    }

    if (isOtpExpired(otpData)) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'OTP has expired. Please request a new OTP.',
        },
        { status: 400 }
      );
      response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());
      return response;
    }

    const updatedOtpData = incrementOtpAttempts(otpData);

    if (updatedOtpData.attempts > getMaxOtpAttempts()) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Too many invalid attempts. Please request a new OTP.',
          attemptsLeft: 0,
        },
        { status: 400 }
      );
      response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());
      return response;
    }

    if (!isOtpValid(updatedOtpData, otp)) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Invalid OTP.',
          attemptsLeft: Math.max(0, getMaxOtpAttempts() - updatedOtpData.attempts),
        },
        { status: 400 }
      );
      response.cookies.set(
        getOtpCookieName(),
        serializeOtpRecord(updatedOtpData),
        getOtpCookieOptions(updatedOtpData.expiryAt)
      );
      return response;
    }

    if (updatedOtpData.customerCompanies.length === 0) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'No valid companies found for this number. Please request a new OTP.',
        },
        { status: 400 }
      );
      response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());
      return response;
    }

    const verifiedOtpData = markOtpRecordVerified(updatedOtpData);
    const response = NextResponse.json({
      success: true,
      data: {
        companies: verifiedOtpData.customerCompanies,
      },
    });

    response.cookies.set(
      getOtpCookieName(),
      serializeOtpRecord(verifiedOtpData),
      getOtpCookieOptions(verifiedOtpData.expiryAt)
    );

    return response;
  } catch (error) {
    console.error('Customer OTP verification error:', error);
    const response = NextResponse.json(
      {
        success: false,
        error: 'Unable to verify customer OTP.',
      },
      { status: 500 }
    );
    response.cookies.set(getOtpCookieName(), '', getExpiredOtpCookieOptions());
    return response;
  }
}
