import { CookieOptions } from 'express';

/**
 * HTTP-only Cookie Configuration for Hybrid Authentication
 *
 * These settings are CRITICAL for security:
 * - httpOnly: true → Cannot access via JavaScript (prevents XSS attacks)
 * - secure: true in production → HTTPS only
 * - sameSite: 'lax' → CSRF protection
 * - path: '/' → Available to entire application
 * - maxAge: Should match JWT expiration
 */

export const getCookieConfig = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', // 'lax' allows top-level navigation, 'strict' is more restrictive
  path: '/',
  // 24 hours (should match JWT_EXPIRES_IN)
  maxAge: 24 * 60 * 60 * 1000,
});

export const getCookieName = (): string => 'access_token';

/**
 * Development vs Production Requirements:
 *
 * DEVELOPMENT:
 * - COOKIE_SECURE = false (cookies work over HTTP)
 * - CORS_ORIGIN = http://localhost:3001
 *
 * PRODUCTION:
 * - COOKIE_SECURE = true (HTTPS required)
 * - CORS_ORIGIN = https://yourdomain.com
 * - NODE_ENV = production
 */
