/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HYBRID AUTHENTICATION MIGRATION GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This guide helps you transition from single-auth (Bearer only) to
 * hybrid auth (OAuth + Bearer) with zero breaking changes.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PRE-MIGRATION CHECKLIST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Before deploying these changes:
 *
 * ☐ Backup your current codebase
 * ☐ Ensure all tests pass before changes
 * ☐ Review all authentication-related code
 * ☐ Notify mobile team (optional, but good practice)
 * ☐ Plan deployment window (no downtime expected)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT'S CHANGED
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ✅ ADDED:
 * 1. cookie-parser package (for reading HTTP-only cookies)
 * 2. helmet-csp package (for Content Security Policy)
 * 3. JWT extraction from cookies (fallback to header)
 * 4. HTTP-only cookie setting in login response
 * 5. Logout endpoint for web apps
 * 6. Rate limiting on login (5 per minute)
 * 7. Enhanced CORS configuration (credentials: true)
 * 8. CSP security headers
 * 9. Rate limiting module (ThrottlerModule)
 *
 * ✅ NO BREAKING CHANGES:
 * 1. Token is STILL returned in login response body
 * 2. Authorization header STILL works
 * 3. JWT payload structure unchanged
 * 4. All existing endpoints work as-is
 * 5. Mobile app requires NO changes
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEPLOYMENT STEPS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * STEP 1: Install new packages
 * $ npm install cookie-parser helmet-csp
 * or
 * $ yarn add cookie-parser helmet-csp
 *
 * STEP 2: Update environment variables
 * In your .env file:
 *
 *   # For development
 *   CORS_ORIGIN=http://localhost:3001
 *   NODE_ENV=development
 *
 *   # For production
 *   CORS_ORIGIN=https://yourdomain.com
 *   NODE_ENV=production
 *
 * ⚠️  CRITICAL: Set CORS_ORIGIN to your Next.js frontend domain
 *     Otherwise, cookies won't be sent in cross-origin requests!
 *
 * STEP 3: Apply code changes
 * All changes are included in this update:
 * - src/main.ts (middleware setup)
 * - src/modules/auth/strategies/jwt.strategy.ts (hybrid extraction)
 * - src/modules/auth/auth.controller.ts (cookie setting + logout)
 * - src/app.module.ts (rate limiting)
 *
 * STEP 4: Test thoroughly
 * - Test with existing mobile app (no changes needed)
 * - Test with new web app using cookies
 * - Test logout functionality
 * - Test error handling
 *
 * STEP 5: Deploy
 * $ yarn build
 * $ yarn start:prod
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INTEGRATION GUIDE: NEXT.JS WEB APP
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * NO SPECIAL CONFIGURATION NEEDED!
 *
 * The browser automatically handles cookies:
 *
 * // pages/login.ts
 * async function login(email: string, password: string) {
 *   const response = await fetch('http://localhost:3000/auth/login', {
 *     method: 'POST',
 *     credentials: 'include', // ⚠️ IMPORTANT: Send cookies
 *     headers: {
 *       'Content-Type': 'application/json',
 *     },
 *     body: JSON.stringify({ email, password }),
 *   });
 *
 *   const data = await response.json();
 *   // The response contains access_token (for reference only)
 *   // The browser automatically stored the cookie
 *
 *   // To use authenticated endpoints:
 *   const profileResponse = await fetch('http://localhost:3000/user/profile', {
 *     credentials: 'include', // Browser sends cookie automatically
 *   });
 * }
 *
 * // pages/logout.ts
 * async function logout() {
 *   await fetch('http://localhost:3000/auth/logout', {
 *     method: 'POST',
 *     credentials: 'include',
 *   });
 *   // Cookie is cleared, user is logged out
 * }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INTEGRATION GUIDE: REACT NATIVE MOBILE APP
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * NO CHANGES REQUIRED!
 *
 * Your existing code continues to work as-is:
 *
 * // store/authStore.ts
 * const login = async (email: string, password: string) => {
 *   const response = await fetch('http://localhost:3000/auth/login', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ email, password }),
 *   });
 *
 *   const data = await response.json();
 *   // Store access_token (unchanged)
 *   await SecureStore.setItemAsync('access_token', data.access_token);
 * };
 *
 * // utils/api.ts
 * const makeAuthenticatedRequest = async (url: string, options: RequestInit) => {
 *   const token = await SecureStore.getItemAsync('access_token');
 *   return fetch(url, {
 *     ...options,
 *     headers: {
 *       ...options.headers,
 *       // Still works! ✓
 *       Authorization: `Bearer ${token}`,
 *     },
 *   });
 * };
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TESTING THE CHANGES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * RUN EXISTING TESTS:
 * $ npm test
 * $ npm run test:e2e
 *
 * All tests should still pass (no breaking changes).
 *
 * MANUAL TESTING:
 *
 * ▶ Test 1: Login returns token in response
 * curl -X POST http://localhost:3000/auth/login \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"user@example.com","password":"password"}'
 *
 * Response:
 * {
 *   "access_token": "eyJhbGc...",
 *   "user": { "id": "123", "email": "user@example.com", "role": "USER" }
 * }
 *
 * Also sets Set-Cookie header:
 * Set-Cookie: access_token=eyJhbGc...; HttpOnly; Secure; Path=/; SameSite=Lax
 *
 * ▶ Test 2: Authorization header still works
 * curl -X GET http://localhost:3000/user/profile \
 *   -H "Authorization: Bearer eyJhbGc..."
 *
 * Response: { "id": "123", "email": "user@example.com", ... }
 * ✓ Should work (mobile compatibility)
 *
 * ▶ Test 3: Cookie authentication works
 * curl -X POST http://localhost:3000/auth/login \
 *   -H "Content-Type: application/json" \
 *   -c cookies.txt \
 *   -d '{"email":"user@example.com","password":"password"}'
 *
 * curl -X GET http://localhost:3000/user/profile \
 *   -b cookies.txt
 *
 * Response: { "id": "123", "email": "user@example.com", ... }
 * ✓ Should work (web compatibility)
 *
 * ▶ Test 4: Logout clears cookie
 * curl -X POST http://localhost:3000/auth/logout \
 *   -b cookies.txt
 *
 * Response: { "message": "Logged out successfully" }
 *
 * curl -X GET http://localhost:3000/user/profile \
 *   -b cookies.txt
 *
 * Response: 401 Unauthorized
 * ✓ Cookie cleared successfully
 *
 * ▶ Test 5: Rate limiting on login
 * Run the login endpoint 6 times in quick succession:
 * for i in {1..6}; do
 *   curl -X POST http://localhost:3000/auth/login \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"user@example.com","password":"password"}'
 *   echo ""
 * done
 *
 * First 5 should succeed, 6th should return 429 Too Many Requests
 * ✓ Rate limiting works
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TROUBLESHOOTING
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PROBLEM: Cookies not being sent to API (web app issue)
 * SOLUTION: Ensure CORS_ORIGIN environment variable is set correctly
 * $ echo $CORS_ORIGIN
 * # Should be your frontend domain (e.g., http://localhost:3001)
 *
 * PROBLEM: Login endpoint returns 429 Too Many Requests
 * SOLUTION: Wait 1 minute for rate limit to reset, or test with different IP
 *
 * PROBLEM: 'access_token' cookie not showing up in developer tools
 * SOLUTION: It's HTTP-only by design. Check Application > Cookies in DevTools
 * # You should NOT see it in document.cookie (that's the security feature)
 *
 * PROBLEM: Mobile app doesn't work after update
 * SOLUTION: No changes should be needed. Verify:
 * 1. Authorization header is still being sent
 * 2. Token extraction from login response still works
 * 3. Check server logs for any errors
 *
 * PROBLEM: Credentials are not included in CORS requests
 * SOLUTION: Verify CORS_ORIGIN matches your frontend exactly
 * # Common mistake: using http://localhost:3001 when server is set to https
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PRODUCTION DEPLOYMENT CHECKLIST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Before going live:
 *
 * ☐ JWT_SECRET is strong and unique
 *   $ openssl rand -base64 32
 *
 * ☐ CORS_ORIGIN is set to your production domain
 *   $ echo $CORS_ORIGIN
 *   # Should be https://yourdomain.com
 *
 * ☐ NODE_ENV=production
 *   $ echo $NODE_ENV
 *
 * ☐ All tests pass
 *   $ npm test
 *   $ npm run test:e2e
 *
 * ☐ Database migrations are applied
 *   $ npm run typeorm migration:run
 *
 * ☐ Cookies set with secure=true (HTTPS only)
 *   # Automatically enabled when NODE_ENV=production
 *
 * ☐ HTTPS certificate is valid
 *   # All cookies must be served over HTTPS in production
 *
 * ☐ Load balancer/reverse proxy forwards credentials header
 *   # If using Nginx/Apache, ensure "X-Forwarded-*" headers are preserved
 *
 * ☐ Rate limiting is appropriate for your user base
 *   # Current: 5 logins per minute per IP
 *   # Adjust in src/app.module.ts if needed
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ROLLBACK INSTRUCTIONS (IF NEEDED)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * If you need to revert to the previous version:
 *
 * $ git revert <commit-hash>
 * $ npm uninstall cookie-parser helmet-csp
 * $ npm run build
 * $ npm start:prod
 *
 * All existing functionality will continue to work.
 * No data loss (only metadata changes to response headers).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEXT STEPS (OPTIONAL IMPROVEMENTS)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * After this hybrid authentication is deployed, consider:
 *
 * 1. REFRESH TOKEN SYSTEM
 *    - Issue short-lived access tokens (15 minutes)
 *    - Issue long-lived refresh tokens (7 days)
 *    - Implement POST /auth/refresh endpoint
 *    - Works for both web and mobile
 *
 * 2. TOKEN BLACKLIST (for logout security)
 *    - Store invalidated tokens in Redis
 *    - Check blacklist in JWT strategy
 *    - Prevents token reuse if leaked
 *
 * 3. MULTI-DEVICE SESSION MANAGEMENT
 *    - Track active sessions per user
 *    - Allow logout from all devices
 *    - Implement session invalidation
 *
 * 4. BIOMETRIC AUTHENTICATION (mobile only)
 *    - Fingerprint/Face ID unlock
 *    - Token stored in secure device storage
 *
 * Documentation for these improvements available on request.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const MIGRATION_GUIDE = 'Hybrid Authentication Migration';
