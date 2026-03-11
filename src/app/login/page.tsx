// =====================================================
// CUSTOMER LOGIN PAGE
// =====================================================

'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAuthStore,
  useCompanyStore,
  useCustomerStore,
  useHasHydrated,
} from '@/shared/lib/stores';
import { useTranslation } from '@/shared/lib/language-context';
import { authService } from '@/versions/v1/services';
import type { Company, CustomerCompanyMatch } from '@/shared/types';

const getCompanyKey = (company: Pick<Company, 'companyId' | 'financialYear'>) =>
  `${company.companyId}:${company.financialYear}`;

const toCompany = (company: CustomerCompanyMatch): Company => ({
  companyId: company.companyId,
  companyName: company.companyName,
  financialYear: company.financialYear,
  erpCode: company.erpCode,
});

export default function LoginPage() {
  const { isAuthenticated, setSession, setError, error } = useAuthStore();
  const setSelectedCompany = useCompanyStore((state) => state.setSelectedCompany);
  const setCompanies = useCompanyStore((state) => state.setCompanies);
  const setCustomer = useCustomerStore((state) => state.setCustomer);
  const hasHydrated = useHasHydrated();
  const t = useTranslation();

  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [matchedCompanies, setMatchedCompanies] = useState<CustomerCompanyMatch[]>([]);
  const [selectedCompanyKey, setSelectedCompanyKey] = useState('');
  const [maskedWhatsappNumber, setMaskedWhatsappNumber] = useState('');
  const [otpExpiryMinutes, setOtpExpiryMinutes] = useState<number | null>(null);
  const [companyCount, setCompanyCount] = useState<number | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCompletingLogin, setIsCompletingLogin] = useState(false);

  const selectedCompany = useMemo(
    () =>
      matchedCompanies.find(
        (company) => getCompanyKey(company) === selectedCompanyKey
      ) ?? null,
    [matchedCompanies, selectedCompanyKey]
  );

  const availableCompanies = useMemo(
    () => matchedCompanies.map((company) => toCompany(company)),
    [matchedCompanies]
  );

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [hasHydrated, isAuthenticated]);

  const resetCustomerFlow = () => {
    setOtp('');
    setOtpSent(false);
    setOtpVerified(false);
    setMatchedCompanies([]);
    setSelectedCompanyKey('');
    setMaskedWhatsappNumber('');
    setOtpExpiryMinutes(null);
    setCompanyCount(null);
  };

  const finalizeCustomerLogin = async (companyMatch: CustomerCompanyMatch) => {
    setError(null);
    setIsCompletingLogin(true);

    const result = await authService.completeCustomerLogin({
      companyId: companyMatch.companyId,
      financialYear: companyMatch.financialYear,
      whatsappNumber,
    });

    if (result.success && result.session) {
      setCompanies(availableCompanies.length > 0 ? availableCompanies : [toCompany(companyMatch)]);
      setSelectedCompany(toCompany(companyMatch));
      setCustomer({
        customerId: result.session.user.id,
        customerName: result.session.user.name,
      });
      setSession(result.session);
      window.setTimeout(() => {
        window.location.href = '/dashboard';
      }, 50);
      return;
    }

    setError(result.error || 'Failed to complete login.');
    setIsCompletingLogin(false);
  };

  const requestCustomerOtp = async () => {
    if (!whatsappNumber.trim()) {
      setError('Please enter your WhatsApp number.');
      return;
    }

    setError(null);
    setIsRequestingOtp(true);

    const result = await authService.requestCustomerOtp({
      whatsappNumber,
    });

    if (result.success) {
      setOtp('');
      setOtpSent(true);
      setOtpVerified(false);
      setMatchedCompanies([]);
      setSelectedCompanyKey('');
      setMaskedWhatsappNumber(result.maskedWhatsappNumber || whatsappNumber);
      setOtpExpiryMinutes(result.expiresInMinutes ?? null);
      setCompanyCount(result.companyCount ?? null);
    } else {
      setError(result.error || 'Failed to send OTP.');
    }

    setIsRequestingOtp(false);
  };

  const verifyCustomerOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setError(null);
    setIsVerifyingOtp(true);

    const result = await authService.verifyCustomerOtp({
      whatsappNumber,
      otp,
    });

    if (result.success && result.companies && result.companies.length > 0) {
      setMatchedCompanies(result.companies);
      setCompanyCount(result.companies.length);

      if (result.companies.length === 1) {
        setSelectedCompanyKey(getCompanyKey(result.companies[0]));
        setOtpVerified(true);
        setIsVerifyingOtp(false);
        await finalizeCustomerLogin(result.companies[0]);
        return;
      }

      setOtpVerified(true);
      const persistedCompany = useCompanyStore.getState().selectedCompany;
      const persistedCompanyKey = persistedCompany
        ? getCompanyKey(persistedCompany)
        : '';
      const nextCompany =
        result.companies.find(
          (company) => getCompanyKey(company) === persistedCompanyKey
        ) || result.companies[0];

      setSelectedCompanyKey(nextCompany ? getCompanyKey(nextCompany) : '');
      setIsVerifyingOtp(false);
      return;
    }

    const attemptsMessage =
      typeof result.attemptsLeft === 'number'
        ? ` ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left.`
        : '';

    setError(`${result.error || 'Failed to verify OTP.'}${attemptsMessage}`);
    setIsVerifyingOtp(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpSent) {
      await requestCustomerOtp();
      return;
    }

    if (!otpVerified) {
      await verifyCustomerOtp();
      return;
    }

    if (selectedCompany) {
      await finalizeCustomerLogin(selectedCompany);
    } else {
      setError('Please select a company to continue.');
    }
  };

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t.auth.loginTitle}</CardTitle>
            <CardDescription>
              Verify your WhatsApp number and continue with linked companies only.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input
                id="whatsappNumber"
                type="tel"
                inputMode="numeric"
                placeholder="Enter WhatsApp number"
                value={whatsappNumber}
                onChange={(e) => {
                  const nextValue = e.target.value.replace(/[^\d+]/g, '');
                  setWhatsappNumber(nextValue);
                  setError(null);
                  if (otpSent || otpVerified) {
                    resetCustomerFlow();
                  }
                }}
                autoComplete="tel"
                required
              />
            </div>

            {otpSent && !otpVerified ? (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enter OTP</p>
                  <p className="text-sm text-muted-foreground">
                    OTP sent to {maskedWhatsappNumber}
                    {otpExpiryMinutes ? ` and valid for ${otpExpiryMinutes} minutes.` : '.'}
                  </p>
                  {companyCount ? (
                    <p className="text-sm text-muted-foreground">
                      Number found in {companyCount} linked {companyCount === 1 ? 'company' : 'companies'}.
                    </p>
                  ) : null}
                </div>
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  autoComplete="one-time-code"
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            ) : null}

            {otpVerified && matchedCompanies.length > 1 ? (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Select Company</p>
                  <p className="text-sm text-muted-foreground">
                    Choose one of the companies linked to your WhatsApp number.
                  </p>
                </div>
                <Select
                  value={selectedCompanyKey}
                  onValueChange={(value) => {
                    setSelectedCompanyKey(value);
                    setError(null);
                  }}
                  disabled={matchedCompanies.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchedCompanies.map((company) => (
                      <SelectItem
                        key={getCompanyKey(company)}
                        value={getCompanyKey(company)}
                      >
                        {company.companyName} - FY {company.financialYear}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isRequestingOtp || isVerifyingOtp || isCompletingLogin}
              >
                {isRequestingOtp || isVerifyingOtp || isCompletingLogin ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isRequestingOtp
                      ? 'Sending OTP...'
                      : isVerifyingOtp
                        ? 'Verifying OTP...'
                        : 'Signing you in...'}
                  </>
                ) : !otpSent ? (
                  'Send OTP'
                ) : !otpVerified ? (
                  'Verify OTP'
                ) : (
                  'Continue'
                )}
              </Button>

              {otpSent && !otpVerified ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    void requestCustomerOtp();
                  }}
                  disabled={isRequestingOtp || isVerifyingOtp}
                >
                  Resend OTP
                </Button>
              ) : null}
            </div>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Staff member?{' '}
            <Link href="/staff-login" className="font-medium text-primary hover:underline">
              Use staff login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
