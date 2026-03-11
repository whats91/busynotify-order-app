import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeWhatsappNumber,
  validateWhatsappNumber,
} from '../_lib/customer-otp';

export const runtime = 'nodejs';

interface ValidateCustomerCompanyBody {
  companyId?: number;
  financialYear?: string;
  whatsappNumber?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ValidateCustomerCompanyBody;
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

    const validationResult = await validateWhatsappNumber({
      companyId,
      financialYear,
      whatsappNumber,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error || 'Failed to validate WhatsApp number.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        isValid: validationResult.isValid,
        customerId: validationResult.customerId,
        customerName: validationResult.customerName,
      },
    });
  } catch (error) {
    console.error('Customer company validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to validate customer company access.',
      },
      { status: 500 }
    );
  }
}
