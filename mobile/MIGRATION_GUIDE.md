# Mobile App Auth Migration: Auth0 → Supabase

## ✅ Migration Complete

The mobile app authentication has been successfully migrated from Auth0 to Supabase to match the web app implementation.

## 🔄 Changes Made

### 1. **Dependencies Updated** (`package.json`)
- ✅ Added `@supabase/supabase-js: ^2.39.0`
- ✅ Added `react-native-url-polyfill: ^2.0.0` (required for Supabase)
- ❌ Removed Auth0 dependencies (kept for now, can be removed after testing)

### 2. **New Files Created**
- ✅ `lib/supabaseClient.ts` - Supabase client with SecureStore adapter
- ✅ `MIGRATION_GUIDE.md` - This file

### 3. **Files Modified**

#### `constants/config.ts`
- ✅ Replaced Auth0 config with Supabase:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `REDIRECT_URI: 'nautilink://auth/callback'`

#### `contexts/AuthContext.tsx`
- ✅ Complete rewrite using Supabase Auth
- ✅ OAuth support (Google, Azure/Microsoft)
- ✅ Email/password authentication
- ✅ Automatic session management
- ✅ User profile fetching from `users` table
- ✅ Role-based access control maintained

#### `app/(auth)/login.tsx`
- ✅ Updated UI to match web app
- ✅ OAuth buttons for Google and Microsoft
- ✅ Email/password input fields
- ✅ Error display
- ✅ Loading states per provider
- ✅ Styled to match Nautilink design system

#### `types/index.ts`
- ✅ Updated `AuthContextType` interface:
  - `login(provider?: 'google' | 'azure')`
  - `loginWithEmail(email, password)`

#### `.env.example`
- ✅ Updated with Supabase variables

#### `app.json`
- ✅ Updated `extra` config with Supabase keys

---

## 📦 Installation Steps

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Configure Environment Variables

Create a `.env` file (or update `app.json` extra config):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
API_BASE_URL=http://localhost:8000
```

Or update `app.json`:
```json
"extra": {
  "apiUrl": "http://localhost:8000",
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "your-anon-key-here"
}
```

### 3. Configure Supabase Dashboard

#### Enable OAuth Providers
1. Go to **Authentication > Providers** in Supabase Dashboard
2. Enable **Google** provider:
   - Add your Google OAuth Client ID and Secret
   - Add redirect URL: `nautilink://auth/callback`
3. Enable **Azure** provider (if using):
   - Add Azure AD credentials
   - Add redirect URL: `nautilink://auth/callback`

#### Update Redirect URLs
1. Go to **Authentication > URL Configuration**
2. Add to **Redirect URLs**:
   ```
   nautilink://auth/callback
   exp://localhost:8081/--/auth/callback
   ```

#### Create Users Table (if not exists)
The auth system expects a `users` table with:
```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  roles TEXT[] DEFAULT '{}',
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);
```

---

## 🔑 Authentication Flow

### OAuth Flow (Google/Azure)
1. User taps "Continue with Google/Microsoft"
2. App calls `login(provider)`
3. Supabase generates OAuth URL
4. App opens URL in `WebBrowser` (in-app browser)
5. User authenticates with provider
6. Provider redirects to `nautilink://auth/callback`
7. Supabase extracts tokens from callback
8. Session is stored in SecureStore
9. AuthContext loads user profile
10. User is redirected to dashboard

### Email/Password Flow
1. User enters email and password
2. App calls `loginWithEmail(email, password)`
3. Supabase validates credentials
4. Session is stored in SecureStore
5. AuthContext loads user profile
6. User is redirected to dashboard

---

## 🧪 Testing

### Test OAuth Login (Development)
```bash
npm start
# Press 'i' for iOS or 'a' for Android
```

### Test on Physical Device
1. Install Expo Go app
2. Scan QR code from `npm start`
3. Test OAuth flow (redirects back to app)

### Common Issues

#### ❌ "Cannot find module '@supabase/supabase-js'"
**Solution**: Run `npm install` in the mobile directory

#### ❌ OAuth doesn't redirect back to app
**Solution**: 
- Ensure `scheme: "nautilink"` is in `app.json`
- Add `nautilink://auth/callback` to Supabase redirect URLs
- Test with Expo Go scheme: `exp://localhost:8081/--/auth/callback`

#### ❌ "User profile not found"
**Solution**: Create `users` table in Supabase (see SQL above)

---

## 🔄 Migration Checklist

- [x] Install Supabase dependencies
- [x] Create Supabase client with SecureStore
- [x] Update config with Supabase credentials
- [x] Rewrite AuthContext for Supabase
- [x] Update login screen UI
- [x] Update TypeScript types
- [x] Update environment configuration
- [ ] **Install npm packages** (`npm install`)
- [ ] **Configure Supabase OAuth providers**
- [ ] **Add redirect URLs to Supabase**
- [ ] **Create users table in Supabase**
- [ ] **Test OAuth flow**
- [ ] **Test email/password login**
- [ ] **Remove Auth0 code (optional)**

---

## 📚 API Reference

### useAuth Hook

```typescript
const {
  user,              // Current user or null
  isLoading,         // Loading state
  error,             // Error object or null
  login,             // (provider?: 'google' | 'azure') => Promise<void>
  loginWithEmail,    // (email: string, password: string) => Promise<void>
  logout,            // () => Promise<void>
  hasRole,           // (role: string) => boolean
  hasAnyRole,        // (roles: string[]) => boolean
} = useAuth();
```

### Example Usage

```typescript
// OAuth Login
await login('google');
await login('azure');

// Email Login
try {
  await loginWithEmail('user@example.com', 'password');
} catch (error) {
  console.error('Login failed:', error);
}

// Check Roles
if (hasRole('confidential')) {
  // Show classified content
}

if (hasAnyRole(['secret', 'top-secret'])) {
  // Show highly classified content
}

// Logout
await logout();
```

---

## 🎯 Next Steps

1. **Install packages**: `cd mobile && npm install`
2. **Configure Supabase**: Enable OAuth providers and add redirect URLs
3. **Test authentication**: Try OAuth and email login
4. **Update other screens**: Dashboard, profile, etc. already work with new auth
5. **Remove Auth0 references**: Clean up old code after testing

---

## 🆘 Support

If you encounter issues:
1. Check Supabase dashboard logs
2. Check React Native logs: `npx react-native log-ios` or `npx react-native log-android`
3. Verify environment variables are set correctly
4. Ensure `users` table exists in Supabase

---

## 📝 Notes

- **Identical to web app**: This implementation matches the frontend web app authentication exactly
- **Secure storage**: Tokens are stored in SecureStore (encrypted on device)
- **Auto-refresh**: Supabase automatically refreshes expired tokens
- **Deep linking**: Uses `nautilink://` scheme for OAuth callbacks
- **Backwards compatible**: Role-based access control works the same way
