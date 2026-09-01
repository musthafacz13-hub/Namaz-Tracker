'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  sendEmailOtp,
  verifyEmailOtp,
  resendSignupOtp,
  updateUserPassword,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { ArrowLeft, CheckCircle2, AlertCircle, KeyRound, Lock, Mail } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: any) => void;
}

type AuthMode =
  | 'signin' // Existing user: Email + Password
  | 'signin_otp' // Existing user: OTP verification before logging in
  | 'signup_email' // New user: Email only
  | 'signup_otp' // New user: 6-digit OTP verification
  | 'signup_password'; // New user: Password creation after OTP verification

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpStatus, setOtpStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Store temporary authenticated user after signup OTP verification to attach password
  const [verifiedUser, setVerifiedUser] = useState<any>(null);

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
    if (mode === 'signup_otp' || mode === 'signin_otp') {
      const firstInput = inputRefs.current[0];
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [mode]);

  const isValidEmail = (val: string): boolean => {
    const normalized = val.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(normalized);
  };

  // ----------------------------------------------------
  // 1. SIGN IN SUBMIT (Step 1: Validate Email + Password)
  // ----------------------------------------------------
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Validate credentials with Supabase
      const { user, error } = await signInWithEmail(normalizedEmail, password);
      if (error) {
        setErrorMessage(error);
        setLoading(false);
        return;
      }

      if (!user) {
        setErrorMessage('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }

      // Step 2: Credentials are valid! Trigger OTP to the user's email for signin verification
      const otpRes = await sendEmailOtp(normalizedEmail);
      if (!otpRes.success) {
        setErrorMessage(otpRes.error || 'Unable to send verification code. Please try again.');
        setLoading(false);
        return;
      }

      setVerifiedUser(user);
      setMode('signin_otp');
      setOtpDigits(['', '', '', '', '', '']);
      setOtpStatus('idle');
      setResendCooldown(60);
      setLoading(false);
      setSuccessMessage('Verification code sent to your email.');
    } catch {
      setErrorMessage('Unable to sign in. Please check your credentials.');
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 2. SIGN UP - STEP 1 (Email Only -> Send OTP)
  // ----------------------------------------------------
  const handleSignUpEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const { success, error } = await sendEmailOtp(normalizedEmail);
      if (!success) {
        setErrorMessage(error || 'Unable to send verification code. Please try again.');
        setLoading(false);
        return;
      }

      setMode('signup_otp');
      setOtpDigits(['', '', '', '', '', '']);
      setOtpStatus('idle');
      setResendCooldown(60);
      setLoading(false);
      setSuccessMessage('Verification code sent to your email.');
    } catch {
      setErrorMessage('Unable to send code. Please try again.');
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 3. OTP INPUT HANDLING
  // ----------------------------------------------------
  const handleOtpChange = (index: number, value: string) => {
    const numericChar = value.replace(/\D/g, '');
    if (otpStatus !== 'idle') setOtpStatus('idle');
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);

    const newDigits = [...otpDigits];

    if (!numericChar) {
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    newDigits[index] = numericChar[numericChar.length - 1];
    setOtpDigits(newDigits);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

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

    const nextEmptyIndex = newDigits.findIndex((d) => !d);
    if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  // ----------------------------------------------------
  // 4. VERIFY OTP SUBMIT
  // ----------------------------------------------------
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
            ? 'This verification code has expired. Request a new code.'
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

        if (mode === 'signin_otp') {
          // Sign in flow: successful OTP verification logs the user in immediately
          setTimeout(() => {
            onSuccess(user);
          }, 600);
        } else {
          // Signup flow: Proceed to Step 3 - Create Password
          setVerifiedUser(user);
          setTimeout(() => {
            setMode('signup_password');
            setPassword('');
            setConfirmPassword('');
            setErrorMessage(null);
            setSuccessMessage(null);
          }, 700);
        }
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

  // ----------------------------------------------------
  // 5. RESEND OTP
  // ----------------------------------------------------
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpStatus('idle');

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { success, error } =
        mode === 'signin_otp'
          ? await sendEmailOtp(normalizedEmail)
          : await resendSignupOtp(normalizedEmail);

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

  // ----------------------------------------------------
  // 6. SIGN UP - STEP 3 (Create Password & Finalize Account)
  // ----------------------------------------------------
  const handleCreatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // If user has an active session from OTP verification, update their password directly
      const updateRes = await updateUserPassword(password);
      if (!updateRes.error && updateRes.user) {
        setSuccessMessage('Account created successfully.');
        setTimeout(() => onSuccess(updateRes.user), 500);
        return;
      }

      // Fallback: Finalize registration with signUpWithEmail
      const { user, session, error } = await signUpWithEmail(normalizedEmail, password);
      if (error) {
        setErrorMessage(error);
        setLoading(false);
        return;
      }

      const activeUser = user || session?.user || verifiedUser;
      if (activeUser) {
        setSuccessMessage('Account created successfully.');
        setTimeout(() => onSuccess(activeUser), 500);
        return;
      }

      setErrorMessage('Unable to complete account registration. Please try again.');
      setLoading(false);
    } catch {
      setErrorMessage('Unable to create password. Please try again.');
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // Navigation helpers
  // ----------------------------------------------------
  const handleChangeEmail = () => {
    setMode('signup_email');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpStatus('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const switchMode = (newMode: 'signin' | 'signup_email') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpStatus('idle');
    setPassword('');
    setConfirmPassword('');
  };

  // ==========================================================
  // VIEW: OTP VERIFICATION SCREEN (For both Signup & Signin)
  // ==========================================================
  if (mode === 'signup_otp' || mode === 'signin_otp') {
    const isOtpComplete = otpDigits.every((d) => d.length === 1);

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
            onClick={() => {
              if (mode === 'signin_otp') {
                setMode('signin');
              } else {
                setMode('signup_email');
              }
              setErrorMessage(null);
              setSuccessMessage(null);
              setOtpStatus('idle');
            }}
            aria-label="Back"
            className="w-10 h-10 -ml-2 flex items-center justify-center text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <span className="text-xs font-mono font-bold tracking-[0.25em] text-neutral-400 uppercase">
            Salah
          </span>
          <div className="w-10" />
        </div>

        {/* Center OTP Container */}
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

          {/* Error Banner (Red) */}
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

          {/* Success Banner (Green) */}
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
            {/* 6 Segmented OTP Boxes */}
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
              <button
                id="verify-otp-submit-btn"
                type="submit"
                disabled={loading || !isOtpComplete || otpStatus === 'success'}
                className="w-full min-h-[46px] bg-black text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
              >
                {loading ? 'VERIFYING...' : otpStatus === 'success' ? 'VERIFIED' : 'VERIFY'}
              </button>

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

              {mode === 'signup_otp' && (
                <button
                  id="change-email-btn"
                  type="button"
                  onClick={handleChangeEmail}
                  disabled={loading || otpStatus === 'success'}
                  className="w-full py-2.5 text-neutral-500 hover:text-black text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer text-center"
                >
                  CHANGE EMAIL
                </button>
              )}
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
  // VIEW: NEW USER - CREATE PASSWORD SCREEN (After OTP Verified)
  // ==========================================================
  if (mode === 'signup_password') {
    return (
      <div className="w-full min-h-screen bg-white text-black flex flex-col justify-between px-6 py-8 sm:py-12 selection:bg-black selection:text-white">
        {/* Top Header */}
        <div className="w-full max-w-sm mx-auto flex items-center justify-between">
          <div className="w-10" />
          <span className="text-xs font-mono font-bold tracking-[0.25em] text-neutral-400 uppercase">
            Salah
          </span>
          <div className="w-10" />
        </div>

        {/* Center Password Setup Container */}
        <div className="w-full max-w-sm mx-auto my-auto py-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 border border-black mx-auto mb-4 flex items-center justify-center bg-white text-black">
              <KeyRound size={22} strokeWidth={2} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black uppercase font-sans">
              Create Password
            </h1>
            <p className="text-xs font-mono text-neutral-500 mt-2 leading-relaxed uppercase tracking-wider">
              Email verified: <span className="text-black font-bold">{email.trim().toLowerCase()}</span>
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div
              id="password-error-banner"
              role="alert"
              className="mb-6 p-3 bg-white border border-red-600 text-red-600 text-xs font-mono text-center flex items-center justify-center gap-2 leading-relaxed"
            >
              <AlertCircle size={14} className="shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              id="password-success-banner"
              role="status"
              className="mb-6 p-3 bg-white border border-emerald-600 text-emerald-600 text-xs font-mono text-center flex items-center justify-center gap-2 leading-relaxed"
            >
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreatePasswordSubmit} className="space-y-5" noValidate>
            {/* New Password Field */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="new-account-password"
                className="block text-xs font-mono font-bold text-neutral-700 uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="new-account-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  className="w-full h-12 pl-4 pr-10 bg-white text-black border border-neutral-300 text-xs font-mono placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:bg-neutral-100"
                />
                <Lock size={15} className="absolute right-3 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="confirm-account-password"
                className="block text-xs font-mono font-bold text-neutral-700 uppercase tracking-wider"
              >
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="confirm-account-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  className="w-full h-12 pl-4 pr-10 bg-white text-black border border-neutral-300 text-xs font-mono placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:bg-neutral-100"
                />
                <Lock size={15} className="absolute right-3 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="set-password-submit-btn"
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full min-h-[46px] mt-3 bg-black text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {loading ? 'CREATING ACCOUNT...' : 'COMPLETE REGISTRATION'}
            </button>
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
  // VIEW: SIGN IN (Existing User: Email + Password)
  //   OR: CREATE ACCOUNT (New User Step 1: Email Only)
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
              : 'Enter your email to receive a 6-digit verification code.'}
          </p>
        </div>

        {/* Error / Feedback Banners */}
        {errorMessage && (
          <div
            id="auth-error-banner"
            role="alert"
            className="mb-6 p-3.5 bg-white border border-red-600 text-red-600 text-xs font-mono text-center flex items-center justify-center gap-2 leading-relaxed"
          >
            <AlertCircle size={14} className="shrink-0 text-red-600" />
            <span>{errorMessage}</span>
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

        {/* Form: SIGN IN (Email + Password) */}
        {mode === 'signin' ? (
          <form onSubmit={handleSignInSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="signin-email"
                className="block text-xs font-mono font-bold text-neutral-700 uppercase tracking-wider"
              >
                Email
              </label>
              <input
                id="signin-email"
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

            <div className="space-y-1.5 text-left">
              <label
                htmlFor="signin-password"
                className="block text-xs font-mono font-bold text-neutral-700 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={loading}
                className="w-full h-12 px-4 bg-white text-black border border-neutral-300 text-xs font-mono placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:bg-neutral-100"
              />
            </div>

            <button
              id="signin-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full min-h-[46px] mt-2 bg-black text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-800 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>
        ) : (
          /* Form: CREATE ACCOUNT STEP 1 (Email Only) */
          <form onSubmit={handleSignUpEmailSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="signup-email-only"
                className="block text-xs font-mono font-bold text-neutral-700 uppercase tracking-wider"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <input
                  id="signup-email-only"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter your Gmail / email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                  disabled={loading}
                  className="w-full h-12 pl-4 pr-10 bg-white text-black border border-neutral-300 text-xs font-mono placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:bg-neutral-100"
                />
                <Mail size={16} className="absolute right-3.5 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            <button
              id="signup-send-otp-btn"
              type="submit"
              disabled={loading || !email}
              className="w-full min-h-[46px] mt-2 bg-black text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-800 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {loading ? 'SENDING CODE...' : 'CONTINUE WITH EMAIL'}
            </button>
          </form>
        )}

        {/* Switcher */}
        <div className="mt-6 text-center">
          {mode === 'signin' ? (
            <p className="text-xs font-mono text-neutral-500">
              Don&apos;t have an account?{' '}
              <button
                id="switch-to-signup-btn"
                type="button"
                onClick={() => switchMode('signup_email')}
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
