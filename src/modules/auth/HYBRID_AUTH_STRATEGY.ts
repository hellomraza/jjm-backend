/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HYBRID JWT AUTHENTICATION STRATEGY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This file documents the dual-authentication approach supporting:
 * 1. Next.js Web Application (HTTP-only cookies)
 * 2. React Native Mobile Application (Bearer tokens)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CLIENT FLOWS:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    NEXT.JS WEB APPLICATION                       │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 1. POST /auth/login (email, password)                           │
 * │    └─> Response: { access_token, user }                         │
 * │        + Cookie: access_token (httpOnly=true)                   │
 * │                                                                  │
 * │ 2. Browser AUTOMATICALLY sends cookie with every request        │
 * │    └─> No Authorization header needed                           │
 * │                                                                  │
 * │ 3. POST /auth/logout (protected)                                │
 * │    └─> Clears cookie                                            │
 * │                                                                  │
 * │ SECURITY BENEFITS:                                              │
 * │ • httpOnly: JS cannot access token (XSS safe)                  │
 * │ • Secure: HTTPS only in production                              │
 * │ • SameSite: Prevents CSRF attacks                               │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │               REACT NATIVE MOBILE APPLICATION                    │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 1. POST /auth/login (email, password)                           │
 * │    └─> Response: { access_token, user }                         │
 * │        [Cookie is ignored on mobile]                            │
 * │                                                                  │
 * │ 2. Extract access_token from response                           │
 * │                                                                  │
 * │ 3. Send with every authenticated request:                       │
 * │    Authorization: Bearer <access_token>                         │
 * │                                                                  │
 * │ 4. On logout:                                                   │
 * │    DELETE /auth/logout (with Authorization header)              │
 * │    + Locally delete stored access_token                         │
 * │                                                                  │
 * │ NO COOKIES INVOLVED - Token management is explicit              │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * JWT EXTRACTION STRATEGY (src/modules/auth/strategies/jwt.strategy.ts)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ExtractJwt function implements priority-based extraction:
 *
 *   extractJwt(req) {
 *     1. IF req.cookies.access_token exists
 *        └─> USE req.cookies.access_token        [For web]
 *
 *     2. ELSE IF Authorization: Bearer token exists
 *        └─> USE extracted token                 [For mobile]
 *
 *     3. ELSE
 *        └─> UNAUTHORIZED                        [No token]
 *   }
 *
 * This ensures BOTH client types work without code changes.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LOGIN ENDPOINT BEHAVIOR (src/modules/auth/auth.controller.ts)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POST /auth/login
 * ├─ ALWAYS returns: { access_token, user } in response body
 * │  └─ Mobile extracts access_token
 * │  └─ Web ignores (uses cookie instead)
 * │
 * └─ ALWAYS sets cookie:
 *    └─ Name: access_token
 *    └─ httpOnly: true           (JavaScript cannot access)
 *    └─ secure: true (prod)      (HTTPS only)
 *    └─ sameSite: lax            (CSRF protection)
 *    └─ path: /                  (Available to entire app)
 *    └─ maxAge: 24h              (Matches JWT expiration)
 *
 * IMPORTANT: Response body is NEVER removed - mobile depends on it!
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LOGOUT ENDPOINT (src/modules/auth/auth.controller.ts)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POST /auth/logout (requires authentication)
 * ├─ Requires valid JWT (via Authorization header or cookie)
 * │
 * ├─ WEB: Clears HTTP-only cookie
 * │   └─ Browser won't send cookie anymore
 * │   └─ Future requests will fail (unauthorized)
 * │
 * └─ MOBILE: Clears nothing server-side
 *     └─ Mobile must manually delete stored token
 *     └─ After deletion, Authorization header won't be sent
 *
 * To prevent token reuse after logout:
 * - OPTIONAL: Implement token blacklist (Redis/database)
 * - OR: Use refresh token rotation with endpoint validation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE STACK (src/main.ts)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. cookieParser() middleware
 *    └─ Parses cookies into req.cookies object
 *    └─ MUST come before routes
 *
 * 2. helmet() middleware
 *    └─ Security headers (Content-Security-Policy, X-Frame-Options, etc.)
 *    └─ Prevents XSS, clickjacking, and other attacks
 *
 * 3. CORS configuration
 *    └─ origin: CORS_ORIGIN environment variable
 *    └─ credentials: true ⚠️ CRITICAL - allows cookies in cross-origin requests
 *    └─ maxAge: 3600 - browser cache preflight requests
 *
 * 4. Global ValidationPipe
 *    └─ Validates incoming requests against DTOs
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SECURITY CONSIDERATIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ✅ IMPLEMENTED:
 * 1. HTTP-only cookies (prevents XSS attacks on web)
 * 2. Secure flag (HTTPS only in production)
 * 3. SameSite policy (CSRF protection)
 * 4. Bearer token support (mobile app)
 * 5. CORS with credentials (allows cookies)
 * 6. CSP headers (prevents XSS)
 *
 * ⚠️ ADDITIONAL RECOMMENDATIONS:
 *
 * 1. RATE LIMITING on login endpoint
 *    └─ Prevents brute-force attacks
 *    └─ NestJS Throttler already installed
 *    └─ See "Rate Limiting" section below
 *
 * 2. TOKEN BLACKLIST (after logout)
 *    └─ Prevents token reuse if stolen
 *    └─ Use Redis or database to track invalidated tokens
 *    └─ Check blacklist in JWT strategy validation
 *
 * 3. REFRESH TOKEN SYSTEM (optional)
 *    └─ Issue short-lived access tokens (15 min)
 *    └─ Issue long-lived refresh tokens (7 days)
 *    └─ Implement POST /auth/refresh endpoint
 *    └─ Works for both web and mobile
 *
 * 4. MULTI-DEVICE SESSION MANAGEMENT (optional)
 *    └─ Track active sessions per user
 *    └─ Allow logout from all devices
 *    └─ Implement session invalidation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * RATE LIMITING IMPLEMENTATION (Recommended)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * In auth.module.ts:
 *
 *   import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
 *   import { APP_GUARD } from '@nestjs/core';
 *
 *   @Module({
 *     imports: [
 *       ThrottlerModule.forRoot([
 *         {
 *           name: 'short',
 *           ttl: 60000,        // 1 minute
 *           limit: 5,          // 5 requests per minute (brute-force protection)
 *         },
 *       ]),
 *       // ... other imports
 *     ],
 *     providers: [
 *       {
 *         provide: APP_GUARD,
 *         useClass: ThrottlerGuard,
 *       },
 *     ],
 *   })
 *
 * Then in auth.controller.ts:
 *
 *   import { Throttle } from '@nestjs/throttler';
 *
 *   @Post('login')
 *   @Throttle({ short: { limit: 5, ttl: 60000 } })
 *   // ... rest of method
 *
 * This limits login attempts to 5 per minute per IP address.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN INVALIDATION / LOGOUT STRATEGIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ▶ STRATEGY 1: Cookie-based (WEB ONLY)
 *   └─ Clear HTTP-only cookie
 *   └─ Browser stops sending cookie
 *   └─ Simple, immediate invalidation
 *   └─ NOT suitable for mobile (tokens valid until expiration)
 *
 * ▶ STRATEGY 2: Token Blacklist (BOTH WEB & MOBILE)
 *   Prerequisites: Redis or database
 *   Flow:
 *   1. On logout, store token jti in blacklist
 *   2. In JWT strategy, check if token.jti is blacklisted
 *   3. If blacklisted, throw UnauthorizedException
 *   Pros: Works for both web and mobile
 *   Cons: Requires external store, memory overhead
 *
 * ▶ STRATEGY 3: Refresh Token Rotation (RECOMMENDED)
 *   Prerequisites: Two JWT types (access + refresh)
 *   Flow:
 *   1. Issue short-lived access_token (15 minutes)
 *   2. Issue long-lived refresh_token (7 days)
 *   3. Access token in memory/cookie, refresh token in secure storage
 *   4. When access token expires, use refresh to get new access token
 *   5. On logout, invalidate refresh token (database/Redis)
 *   Pros: Minimal token reuse window, mobile-friendly
 *   Cons: More complex, requires refresh endpoint
 *
 * CURRENT IMPLEMENTATION: Strategy 1 + optional Strategy 2
 * RECOMMENDED UPGRADE: Strategy 3 (refresh tokens)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ENVIRONMENT VARIABLES REQUIRED
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * JWT_SECRET
 *   └─ Secret key for signing JWTs
 *   └─ Generate: openssl rand -base64 32
 *   └─ CRITICAL: Keep secret, rotate periodically
 *
 * JWT_EXPIRES_IN
 *   └─ Token expiration time
 *   └─ Default: 1d (1 day)
 *   └─ Note: Should match cookie maxAge
 *
 * CORS_ORIGIN
 *   └─ Allowed frontend domain
 *   └─ Dev: http://localhost:3001
 *   └─ Prod: https://yourdomain.com
 *   └─ CRITICAL: Set this for production
 *
 * NODE_ENV
 *   └─ Enforces HTTPS for cookies in production
 *   └─ Set to 'production' in production environment
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TESTING THE HYBRID AUTHENTICATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ▶ TEST 1: Mobile App (Bearer Token)
 *   curl -X POST http://localhost:3000/auth/login \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"user@example.com","password":"password123"}'
 *
 *   Extract access_token from response, then:
 *
 *   curl -X GET http://localhost:3000/user/profile \
 *     -H "Authorization: Bearer <access_token>"
 *
 *   ✓ Should return user profile
 *
 * ▶ TEST 2: Web App (Cookie)
 *   curl -X POST http://localhost:3000/auth/login \
 *     -H "Content-Type: application/json" \
 *     -c cookies.txt \
 *     -d '{"email":"user@example.com","password":"password123"}'
 *
 *   Then use cookies in subsequent requests:
 *
 *   curl -X GET http://localhost:3000/user/profile \
 *     -b cookies.txt
 *
 *   ✓ Should return user profile (no Authorization header needed)
 *
 * ▶ TEST 3: Logout (Web)
 *   curl -X POST http://localhost:3000/auth/logout \
 *     -b cookies.txt
 *
 *   Then:
 *
 *   curl -X GET http://localhost:3000/user/profile \
 *     -b cookies.txt
 *
 *   ✗ Should return 401 Unauthorized
 *
 * ▶ TEST 4: Logout (Mobile)
 *   curl -X POST http://localhost:3000/auth/logout \
 *     -H "Authorization: Bearer <access_token>"
 *
 *   Locally delete token, then:
 *
 *   curl -X GET http://localhost:3000/user/profile \
 *     -H "Authorization: Bearer <access_token>"
 *
 *   ✗ Should return 401 Unauthorized
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BACKWARD COMPATIBILITY STATUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ✅ Mobile App (React Native)
 * ├─ Extract access_token from login response: ✓ UNCHANGED
 * ├─ Send Authorization: Bearer token: ✓ WORKS
 * ├─ HTTP endpoints remain compatible: ✓ WORKS
 * └─ NO CHANGES REQUIRED in mobile app code
 *
 * ✅ Existing API Clients
 * ├─ Bearer token endpoints: ✓ WORKS
 * ├─ Protected routes: ✓ WORKS
 * └─ No breaking changes
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const HYBRID_AUTH_STRATEGY = 'hybrid-jwt-with-cookie-fallback';
