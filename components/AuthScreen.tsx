'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  verifyEmailOtp,
  resendSignupOtp,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: any) => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'otp'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpStatus, setOtpStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // References to the 6 individual OTP input boxes for smooth typing and pasting
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus first input box when entering OTP mode
  useEffect(() => {
    if (mode === 'otp') {
      const firstInput = inputRefs.current[0];
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [mode]);

  const validateCredentials = (): boolean => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage('Please enter your email.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return false;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return false;
    }

    return true;
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCredentials()) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (mode === 'signin') {
        const { user, error } = await signInWithEmail(normalizedEmail, password);
        if (error) {
          setErrorMessage(error);
          setLoading(false);
          return;
        }
        if (user) {
          onSuccess(user);
          return;
        }
      } else {
        const { user, session, error } = await signUpWithEmail(normalizedEmail, password);
        if (error) {
          setErrorMessage(error);
          setLoading(false);
          return;
        }

        // If session is already confirmed (e.g. email confirmation disabled in local/testing environment)
        if (session && user) {
          onSuccess(user);
          return;
        }

        // Email verification is required: transition to the dedicated OTP screen
        setMode('otp');
        setOtpDigits(['', '', '', '', '', '']);
        setOtpStatus('idle');
        setResendCooldown(60); // 60s cooldown timer
        setLoading(false);
        setSuccessMessage(null);
      }
    } catch {
      setErrorMessage(
        mode === 'signin'
          ? 'Unable to sign in. Please check your email and password.'
          : 'Unable to create account. Please try again.'
      );
      setLoading(false);
    }
  };

  // Handle individual digit input in OTP boxes
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric characters
    const numericChar = value.replace(/\D/g, '');
    if (otpStatus !== 'idle') setOtpStatus('idle');
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);

    const newDigits = [...otpDigits];

    if (!numericChar) {
      // Deletion
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Handle typing single digit
    newDigits[index] = numericChar[numericChar.length - 1];
    setOtpDigits(newDigits);

    // Auto-advance to next input box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace key navigation
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full 6-digit code
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    if (otpStatus !== 'idle') setOtpStatus('idle');
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setOtpDigits(newDigits);

    // Focus the next empty box or the last box
    const nextEmptyIndex = newDigits.findIndex((d) => !d);
    if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  // Submit OTP Verification
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      setOtpStatus('error');
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpStatus('idle');

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { user, error } = await verifyEmailOtp(normalizedEmail, fullOtp);

      if (error) {
        setOtpStatus('error');
        setErrorMessage(
          error.includes('expired')
            ? 'This code has expired. Request a new code.'
            : error.includes('connection') || error.includes('network')
            ? 'Unable to verify right now. Check your connection and try again.'
            : 'Incorrect verification code.'
        );
        setLoading(false);
        return;
      }

      if (user) {
        setOtpStatus('success');
        setSuccessMessage('Email verified successfully.');
        setLoading(false);
        // Subtle brief delay to allow user to see success state before navigating to Home
        setTimeout(() => {
          onSuccess(user);
        }, 600);
        return;
      }

      setOtpStatus('error');
      setErrorMessage('Incorrect verification code.');
      setLoading(false);
    } catch {
      setOtpStatus('error');
      setErrorMessage('Unable to verify right now. Check your connection and try again.');
      setLoading(false);
    }
  };

  // Resend OTP with cooldown
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpStatus('idle');

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { success, error } = await resendSignupOtp(normalizedEmail);
      if (success) {
        setResendCooldown(60);
        setSuccessMessage('A new verification code has been sent.');
      } else {
        setErrorMessage(error || 'Unable to send code. Please try again.');
      }
    } catch {
      setErrorMessage('Unable to verify right now. Check your connection and try again.');
    } finally {
      setResending(false);
    }
  };

  // Switch back to signup from OTP
  const handleChangeEmail = () => {
    setMode('signup');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpStatus('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // ==========================================================
  // OTP SCREEN VIEW
  // ==========================================================
  if (mode === 'otp') {
    const isOtpComplete = otpDigits.every((d) => d.length === 1);

    // Dynamic input border styling based on OTP verification state
    const getInputStyle = () => {
      if (otpStatus === 'error') {
        return 'border-red-600 text-red-600 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-600';
      }
      if (otpStatus === 'success') {
        return 'border-emerald-600 text-emerald-600 bg-emerald-50/20 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600';
      }
      return 'border-neutral-300 text-black bg-white focus:border-black focus:ring-1 focus:ring-black';
    };

    return (
      <div className="w-full min-h-screen bg-white text-black flex flex-col justify-between px-6 py-8 sm:py-12 selection:bg-black selection:text-white">
        {/* Top Header */}
        <div className="w-full max-w-sm mx-auto flex items-center justify-between">
          <button
            onClick={handleChangeEmail}
            aria-label="Back to Create Account"
            className="w-10 h-10 -ml-2 flex items-center justify-center text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <span className="text-xs font-mono font-bold tracking-[0.25em] text-neutral-400 uppercase">
            Salah
          </span>
          <div className="w-10" />
        </div>

        {/* Center Container */}
        <div className="w-full max-w-sm mx-auto my-auto py-6">
          <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-black font-sans">
              VERIFY YOUR EMAIL
            </h1>
            <p className="text-xs text-neutral-500 font-mono mt-2 leading-relaxed">
              Enter the 6-digit code sent to your email.
            </p>
            <p className="text-xs font-mono font-bold text-black mt-1 break-all">
              {email.trim().toLowerCase()}
            </p>
          </div>

          {/* Feedback Messages with dynamic indicator colors */}
          {errorMessage && (
            <div
              id="otp-error-banner"
              role="alert"
              className="mb-6 p-3 bg-white border border-red-600 text-red-600 text-xs font-mono text-center flex items-center justify-center gap-2 leading-relaxed"
            >
              <AlertCircle size={14} className="shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              id="otp-success-banner"
              role="status"
              className={`mb-6 p-3 bg-white border text-xs font-mono text-center flex items-center justify-center gap-2 leading-relaxed ${
                otpStatus === 'success'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-neutral-300 text-neutral-800'
              }`}
            >
              <CheckCircle2
                size={14}
                className={`shrink-0 ${
                  otpStatus === 'success' ? 'text-emerald-600' : 'text-black'
                }`}
              />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            {/* 6 Segmented OTP Input Boxes */}
            <div>
              <div
                className="grid grid-cols-6 gap-2 sm:gap-2.5"
                onPaste={handleOtpPaste}
              >
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-digit-${idx}`}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={loading || otpStatus === 'success'}
                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    className={`w-full h-13 sm:h-14 text-center font-mono text-lg font-bold border focus:outline-none transition-colors disabled:opacity-60 ${getInputStyle()}`}
                    aria-label={`Digit ${idx + 1} of verification code`}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              {/* Verify Button */}
              <button
                id="verify-otp-submit-btn"
                type="submit"
                disabled={loading || !isOtpComplete || otpStatus === 'success'}
                className="w-full min-h-[46px] bg-black text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
              >
                {loading ? 'VERIFYING...' : otpStatus === 'success' ? 'VERIFIED' : 'VERIFY'}
              </button>

              {/* Resend Code Button */}
              <button
                id="resend-otp-btn"
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || resending || loading || otpStatus === 'success'}
                className="w-full min-h-[42px] border border-neutral-300 bg-white text-black text-xs font-mono font-bold uppercase tracking-wider hover:border-black hover:bg-neutral-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-black transition-colors disabled:opacity-40 disabled:hover:border-neutral-300 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
              >
                {resending
                  ? 'SENDING...'
                  : resendCooldown > 0
                  ? `RESEND CODE (${resendCooldown}S)`
                  : 'RESEND CODE'}
              </button>

              {/* Change Email Button */}
              <button
                id="change-email-btn"
                type="button"
                onClick={handleChangeEmail}
                disabled={loading || otpStatus === 'success'}
                className="w-full py-2.5 text-neutral-500 hover:text-black text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer text-center"
              >
                CHANGE EMAIL
              </button>
            </div>
          </form>
        </div>

        {/* Subtle Quote at Bottom */}
        <div className="w-full max-w-sm mx-auto text-center pt-6 pb-2">
          <p className="text-[11px] font-mono tracking-widest text-neutral-400 uppercase">
            &ldquo;Salah is the key of Heaven.&rdquo;
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // SIGN IN / SIGN UP SCREEN VIEW
  // ==========================================================
  return (
    <div className="w-full min-h-screen bg-white text-black flex flex-col justify-between px-6 py-8 sm:py-12 selection:bg-black selection:text-white">
      {/* Top Header */}
      <div className="w-full max-w-sm mx-auto flex items-center justify-center">
        <span className="text-xs font-mono font-bold tracking-[0.25em] text-neutral-400 uppercase">
          Salah
        </span>
      </div>

      {/* Center Auth Container */}
      <div className="w-full max-w-sm mx-auto my-auto py-8">
        {/* Brand & Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black uppercase font-sans">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-xs font-mono text-neutral-500 mt-2 leading-relaxed uppercase tracking-wider">
            {mode === 'signin'
              ? 'Sign in to continue your Salah journey.'
              : 'Sign up to track and preserve your daily Salah.'}
          </p>
        </div>

        {/* Error / Feedback Banners */}
        {errorMessage && (
          <div
            id="auth-error-banner"
            role="alert"
            className="mb-6 p-3.5 bg-neutral-50 border border-black text-black text-xs font-mono text-center leading-relaxed"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            id="auth-success-banner"
            role="status"
            className="mb-6 p-3.5 bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs font-mono text-center leading-relaxed"
          >
            {successMessage}
          </div>
        )}

        {/* Supabase unconfigured warning if keys are not set */}
        {!isSupabaseConfigured() && (
          <div className="mb-6 p-3 bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-mono text-center">
            SUPABASE IS RUNNING IN OFFLINE LOCAL MODE
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleCredentialSubmit} className="space-y-5" noValidate>
          {/* Email Field */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="auth-email"
              className="block text-xs font-mono font-bold text-neutral-700 uppercase tracking-wider"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Enter your email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              required
              disabled={loading}
              className="w-full h-12 px-4 bg-white text-black border border-neutral-300 text-xs font-mono placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:bg-neutral-100"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="auth-password"
              className="block text-xs font-mono font-bold text-neutral-700 uppercase tracking-wider"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Enter your password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              disabled={loading}
              className="w-full h-12 px-4 bg-white text-black border border-neutral-300 text-xs font-mono placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:bg-neutral-100"
            />
          </div>

          {/* Primary Action Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full min-h-[46px] mt-2 bg-black text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-800 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
          >
            {loading ? (
              <span className="font-mono text-xs uppercase tracking-wider">
                {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : mode === 'signin' ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </button>
        </form>

        {/* Secondary Switch Option */}
        <div className="mt-6 text-center">
          {mode === 'signin' ? (
            <p className="text-xs font-mono text-neutral-500">
              Don&apos;t have an account?{' '}
              <button
                id="switch-to-signup-btn"
                type="button"
                onClick={() => switchMode('signup')}
                className="text-black font-bold hover:underline underline-offset-4 ml-1 transition-all cursor-pointer uppercase"
              >
                Create account
              </button>
            </p>
          ) : (
            <p className="text-xs font-mono text-neutral-500">
              Already have an account?{' '}
              <button
                id="switch-to-signin-btn"
                type="button"
                onClick={() => switchMode('signin')}
                className="text-black font-bold hover:underline underline-offset-4 ml-1 transition-all cursor-pointer uppercase"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Subtle Quote at Bottom */}
      <div className="w-full max-w-sm mx-auto text-center pt-6 pb-2">
        <p className="text-[11px] font-mono tracking-widest text-neutral-400 uppercase">
          &ldquo;Salah is the key of Heaven.&rdquo;
        </p>
      </div>
    </div>
  );
}
