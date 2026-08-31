'use client';

import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail, isSupabaseConfigured } from '@/lib/supabase';

interface AuthScreenProps {
  onSuccess: (user: any) => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validate = (): boolean => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage('Please enter your email.');
      return false;
    }

    // Standard email regex format check
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

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
        const { user, error } = await signUpWithEmail(normalizedEmail, password);
        if (error) {
          setErrorMessage(error);
          setLoading(false);
          return;
        }
        if (user) {
          setSuccessMessage('Account created successfully.');
          onSuccess(user);
          return;
        }
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

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="w-full min-h-screen bg-white text-black flex flex-col justify-between px-6 py-8 sm:py-12">
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
            {mode === 'signin'
              ? 'Sign in to continue your Salah journey.'
              : 'Sign up to track and preserve your daily Salah.'}
          </p>
        </div>

        {/* Error / Feedback Banners */}
        {errorMessage && (
          <div
            id="auth-error-banner"
            className="mb-6 p-3.5 bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs font-mono rounded-lg text-center leading-relaxed"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            id="auth-success-banner"
            className="mb-6 p-3.5 bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs font-mono rounded-lg text-center leading-relaxed"
          >
            {successMessage}
          </div>
        )}

        {/* Supabase unconfigured warning if keys are not set */}
        {!isSupabaseConfigured() && (
          <div className="mb-6 p-3 bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-mono text-center rounded-lg">
            SUPABASE IS RUNNING IN OFFLINE LOCAL MODE
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email Field */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-neutral-700 uppercase tracking-wider"
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
              className="w-full h-12 px-4 bg-white text-black border border-neutral-300 rounded-lg text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:bg-neutral-100"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-neutral-700 uppercase tracking-wider"
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
              className="w-full h-12 px-4 bg-white text-black border border-neutral-300 rounded-lg text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:bg-neutral-100"
            />
          </div>

          {/* Primary Action Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-neutral-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
            <p className="text-xs text-neutral-500">
              Don&apos;t have an account?{' '}
              <button
                id="switch-to-signup-btn"
                type="button"
                onClick={() => switchMode('signup')}
                className="text-black font-semibold hover:underline underline-offset-4 ml-1 transition-all"
              >
                Create account
              </button>
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
              Already have an account?{' '}
              <button
                id="switch-to-signin-btn"
                type="button"
                onClick={() => switchMode('signin')}
                className="text-black font-semibold hover:underline underline-offset-4 ml-1 transition-all"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Subtle Quote at Bottom */}
      <div className="w-full max-w-sm mx-auto text-center pt-6 pb-2">
        <p className="text-xs font-mono tracking-widest text-neutral-400 uppercase">
          &ldquo;Salah is the key of Heaven.&rdquo;
        </p>
      </div>
    </div>
  );
}
