# 🚀 QUICK START: Hybrid Authentication

## For Web Developers (Next.js)

### 1. Setup (Client-Side)
```typescript
// pages/login.tsx
const login = async (email: string, password: string) => {
  const response = await fetch('https://api.example.com/auth/login', {
    method: 'POST',
    credentials: 'include',  // ← IMPORTANT: Enable cookies
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) throw new Error('Login failed');
  const data = await response.json();
  // Cookie is now stored automatically
};
```

### 2. Protected Requests
```typescript
// Automatic - no Authorization header needed!
const getProfile = async () => {
  const response = await fetch('https://api.example.com/user/profile', {
    credentials: 'include',  // ← Send cookie automatically
  });
  return response.json();
};
```

### 3. Logout
```typescript
const logout = async () => {
  await fetch('https://api.example.com/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  // Cookie cleared, user logged out
};
```

### ✅ That's it! No additional config needed.

---

## For Mobile Developers (React Native)

### ✅ NO CHANGES REQUIRED
Your existing code continues to work exactly as before:

```typescript
// Extract token from response (unchanged)
const { access_token } = await AuthService.login(email, password);

// Send in Authorization header (unchanged)
const getProfile = async () => {
  const response = await fetch('https://api.example.com/user/profile', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  return response.json();
};

// Logout (unchanged)
const logout = async () => {
  await SecureStore.removeItem('access_token');
};
```

### ✅ Zero code changes needed

---

## For Backend Developers

### Setup (Done ✅)
1. `src/main.ts` - Cookie parser + CORS configured
2. `src/modules/auth/strategies/jwt.strategy.ts` - Hybrid extraction
3. `src/modules/auth/auth.controller.ts` - Cookie setting + logout
4. `src/app.module.ts` - Rate limiting configured

### Environment Variables
```bash
# Set these in your .env

# Web frontend domain (CRITICAL!)
CORS_ORIGIN=http://localhost:3001  # Dev
# CORS_ORIGIN=https://yourdomain.com  # Production

# Existing JWT config (unchanged)
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=1d

# Application
NODE_ENV=development  # production in production
PORT=3000
```

### Test
```bash
# All tests pass ✅
yarn test

# Build works ✅
yarn build

# Ready to deploy ✅
```

---

## ⚠️ Critical Remember

### 1. CORS_ORIGIN
```javascript
// ❌ WRONG
app.enableCors()

// ✅ RIGHT
app.enableCors({ 
  origin: process.env.CORS_ORIGIN,
  credentials: true 
})
```

### 2. credentials Flag (Web Only)
```javascript
// ❌ Won't send cookie
fetch('/api/data')

// ✅ Sends cookie
fetch('/api/data', { credentials: 'include' })
```

### 3. Mobile - Still Uses Header
```typescript
// Mobile still sends Authorization header ✓
Authorization: Bearer access_token_here
```

---

## 🧪 Quick Test

### Test 1: Web (Cookie)
```bash
curl -c cookies.txt \
  -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Should get Set-Cookie in response headers

curl -b cookies.txt \
  -X GET https://api.example.com/user/profile

# Should work (cookie sent automatically)
```

### Test 2: Mobile (Bearer)
```bash
curl -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Extract access_token from response

curl -X GET https://api.example.com/user/profile \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"

# Should work (header sent)
```

### Test 3: Rate Limit
```bash
# Make 6 login requests rapidly
for i in {1..6}; do
  curl -X POST https://api.example.com/auth/login \
    -d '{"email":"test","password":"test"}'
  echo ""
done

# 1-5: Success/Fail (200/401)
# 6: 429 Too Many Requests ✓
```

---

## 📖 Full Documentation

- **Technical**: See `HYBRID_AUTH_STRATEGY.ts`
- **Deployment**: See `AUTH_MIGRATION_GUIDE.md`
- **Security**: See `SECURITY_AUDIT_REPORT.md`
- **Summary**: See `IMPLEMENTATION_COMPLETE.md`

---

## 🆘 Troubleshooting

### Cookies not being sent?
```
1. Check CORS_ORIGIN is set correctly
2. Use credentials: 'include' in fetch
3. Verify request is to same domain
```

### Mobile app broken?
```
1. Keep sending Authorization header
2. Use Bearer tokens as before
3. No code changes needed
```

### Too many 429 errors?
```
1. Rate limit is 5 per minute per IP
2. Wait 1 minute or adjust CORS_ORIGIN
3. (Developers can adjust ThrottlerModule)
```

---

## ✅ Checklist for Deployment

- [ ] Update CORS_ORIGIN in .env
- [ ] Set NODE_ENV=production
- [ ] Verify HTTPS is working
- [ ] Run `yarn test` (all pass)
- [ ] Run `yarn build` (no errors)
- [ ] Deploy with confidence! 🚀

---

**Status**: ✅ Ready to use  
**Backward Compatible**: ✅ Yes  
**Mobile Changes Required**: ❌ No  

---
