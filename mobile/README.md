# Nautilink Mobile App

A React Native mobile application built with Expo for the Nautilink Maritime Intelligence & Surveillance Platform.

## Features

- 🔐 **Auth0 Authentication** - Secure OAuth login flow
- 📊 **Dashboard** - Real-time maritime surveillance statistics
- 📸 **Trip Camera** - Document fishing trips with photo capture and upload
- 📝 **Reports** - AI-generated intelligence reports
- 👤 **Profile** - User account management and security clearance display
- 🎨 **Modern UI** - Clean, professional design matching the web app
- 🔒 **Role-Based Access** - Different views based on security clearance

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Studio (for Android development)
- Expo Go app on your physical device (optional)

## Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_REDIRECT_URI=nautilink://callback
API_BASE_URL=http://localhost:8000
```

## Auth0 Configuration

1. Create a **Native** application in your Auth0 dashboard
2. Set the following in your Auth0 application settings:
   - **Allowed Callback URLs**: `nautilink://callback`
   - **Allowed Logout URLs**: `nautilink://`
   - **Allowed Origins (CORS)**: Your API URL
3. Enable the following **Grant Types**:
   - Authorization Code
   - Refresh Token
4. Add custom user metadata for roles (under Users > User Management):
```json
{
  "roles": ["confidential", "secret"]
}
```

## Running the App

### Development

Start the Expo development server:
```bash
npm start
```

This will open Expo DevTools in your browser. From there you can:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Scan the QR code with Expo Go app on your phone

### iOS

```bash
npm run ios
```

### Android

```bash
npm run android
```

### Web (for testing)

```bash
npm run web
```

## Project Structure

```
mobile/
├── app/                    # App screens (Expo Router)
│   ├── (auth)/            # Authentication screens
│   │   └── login.tsx      # Login screen
│   ├── (tabs)/            # Main app tabs
│   │   ├── dashboard.tsx  # Dashboard screen
│   │   ├── profile.tsx    # Profile screen
│   │   └── reports.tsx    # Reports screen
│   ├── _layout.tsx        # Root layout with AuthProvider
│   └── index.tsx          # Landing screen
├── components/            # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   └── Header.tsx
├── constants/             # App constants
│   ├── Colors.ts          # Color palette
│   └── config.ts          # Configuration
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
├── types/                 # TypeScript types
│   └── index.ts
├── app.json              # Expo configuration
├── package.json
└── tsconfig.json
```

## Screens Overview

### 1. Landing Screen (`app/index.tsx`)
- First screen users see
- Displays Nautilink branding
- "Enter Dashboard" button navigates to login
- Auto-redirects to dashboard if already authenticated

### 2. Login Screen (`app/(auth)/login.tsx`)
- Auth0 OAuth authentication
- Clean, professional login UI
- Automatic navigation after successful login
- Back button to return to landing

### 3. Dashboard (`app/(tabs)/dashboard.tsx`)
- Overview of maritime surveillance
- Statistics cards (total vessels, registered, unregistered)
- System status indicator
- User clearance display
- Quick actions list
- Pull-to-refresh functionality

### 4. Trip (`app/(tabs)/trip.tsx`)
- Start/end fishing trip tracking
- Live trip duration timer
- Camera integration for catch documentation
- Take photos directly with camera
- Select photos from gallery
- Photo grid with timestamp display
- Delete individual photos
- Batch photo upload (backend integration pending)
- Trip statistics (photo count, duration)
- Real-time trip status indicator

### 5. Reports (`app/(tabs)/reports.tsx`)
- List of AI-generated intelligence reports
- Report cards with:
  - Title, date, and type (daily/weekly/monthly)
  - Status (completed/processing)
  - Summary text
  - Actions (view, download, share)
- Statistics for total, completed, and processing reports
- Pull-to-refresh functionality

### 6. Profile (`app/(tabs)/profile.tsx`)
- User information display
- Security clearance badges
- Account details (user ID, email)
- Settings menu (notifications, privacy, about)
- Logout functionality

## Components

### Button
Reusable button component with three variants:
- `primary` - Filled button with accent color
- `secondary` - Glass-effect button
- `outline` - Outlined button
- Loading state support

### Card
Container component with consistent styling:
- Rounded corners
- Border and shadow
- Dark theme background

### Header
Screen header component:
- Title display
- Optional back button
- Optional right action button

## Authentication

The app uses Auth0 for authentication with the following flow:

1. User taps "Sign In with Auth0"
2. Expo AuthSession opens Auth0 login page
3. User authenticates
4. Auth0 redirects back with authorization code
5. App exchanges code for access token
6. User info fetched and stored in SecureStore
7. User redirected to dashboard

### Role-Based Access

The app supports role-based access control with four clearance levels:
- `public-trust` - Basic access
- `confidential` - Can view unregistered vessels
- `secret` - Advanced features
- `top-secret` - Full admin access

Unregistered vessels are only visible to users with `confidential` clearance or higher.

## Styling

The app uses a consistent color scheme matching the web application:

- **Background**: `#171717` (Dark charcoal)
- **Primary Accent**: `#4662ab` (Navy blue)
- **Light Accent**: `#e0f2fd` (Light blue)
- **Success**: `#2eb700` (Green)
- **Danger**: `#fc0303` (Red)

All colors are defined in `constants/Colors.ts`.

## API Integration

The app communicates with the backend API defined in `API_BASE_URL`. Currently implemented endpoints:

- `GET /api/getPositions` - Fetch vessel positions
- Future: Reports, alerts, user management

To connect to a local backend:
```env
API_BASE_URL=http://localhost:8000
```

For Android emulator, use:
```env
API_BASE_URL=http://10.0.2.2:8000
```

## Known Limitations

1. **Globe Visualization**: Not implemented in mobile app (complex 3D rendering)
2. **AI Agent Panel**: Not implemented (better suited for larger screens)
3. **Admin Features**: Limited to web app
4. **Offline Support**: Not yet implemented
5. **Push Notifications**: Not yet configured

## Future Enhancements

- [ ] Add map view for vessel positions (using react-native-maps)
- [ ] Implement push notifications for alerts
- [ ] Add offline caching
- [ ] Biometric authentication
- [ ] Dark mode toggle
- [ ] Export reports as PDF
- [ ] Real-time vessel tracking updates
- [ ] Search and filter functionality
- [ ] Advanced analytics charts

## Troubleshooting

### App won't start
```bash
# Clear cache and restart
npm start --clear
```

### Build errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Auth0 redirect not working
- Check that `nautilink://callback` is in Auth0 Allowed Callback URLs
- Verify `AUTH0_REDIRECT_URI` matches in `.env`
- Make sure `scheme: "nautilink"` is in `app.json`

### Can't connect to API
- For iOS simulator, use `http://localhost:8000`
- For Android emulator, use `http://10.0.2.2:8000`
- Ensure backend is running
- Check network permissions

## Building for Production

### iOS

1. Configure app identifier in `app.json`:
```json
"ios": {
  "bundleIdentifier": "com.nautilink.app"
}
```

2. Build:
```bash
eas build --platform ios
```

### Android

1. Configure package name in `app.json`:
```json
"android": {
  "package": "com.nautilink.app"
}
```

2. Build:
```bash
eas build --platform android
```

## License

Copyright © 2025 Nautilink. All rights reserved.

## Support

For issues or questions, please open an issue on the project repository.
