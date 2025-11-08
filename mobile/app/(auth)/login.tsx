import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import type { Provider } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

type ProviderId = 'google' | 'azure' | 'cac-piv' | 'login-gov';

const providers = [
  { id: 'google' as const, label: 'Continue with Google', iconName: 'logo-google', color: '#EA4335' },
  { id: 'azure' as const, label: 'Continue with Microsoft', iconName: 'logo-microsoft', color: '#00A4EF' },
  { id: 'cac-piv' as const, label: 'CAC / PIV Smart Card Authentication', iconName: 'card-outline', color: '#c6daec' },
  { id: 'login-gov' as const, label: 'Login.gov SSO', iconName: 'shield-checkmark-outline', color: '#c6daec' },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'supplier' | 'regulator' | 'consumer'>('supplier');
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/(main)/home');
    }
  }, [user, authLoading]);

  const handleOAuthLogin = async (provider: ProviderId) => {
    setLoadingProvider(provider);
    setError(null);

    // CAC/PIV and Login.gov not supported on mobile
    if (provider === 'cac-piv' || provider === 'login-gov') {
      setTimeout(() => {
        setError('This secure login option requires an approved hardware credential. Contact your administrator to proceed.');
        setLoadingProvider(null);
      }, 320);
      return;
    }

    try {
      const redirectTo = makeRedirectUri({
        scheme: 'nautilink',
        path: 'auth/callback',
      });

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      if (oauthError) throw oauthError;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          router.replace('/(main)/home');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) return;
    if (isSignup && !fullName) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isSignup) {
        // Signup
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              user_type: userType,
              roles: [userType],
            },
          },
        });

        if (signupError) {
          setError(signupError.message);
          return;
        }

        if (data.user) {
          if (data.session) {
            router.push('/(main)/home');
          } else {
            setError('Please check your email to confirm your account before signing in.');
            setIsSignup(false);
          }
        }
      } else {
        // Login
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          setError(loginError.message);
          return;
        }

        if (data.session) {
          router.push('/(main)/home');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Card */}
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={isSignup ? 'person-add-outline' : 'log-in-outline'}
                  size={28}
                  color="#c6daec"
                />
              </View>
              <Text style={styles.title}>
                {isSignup ? 'Create Account' : 'Access Nautilink'}
              </Text>
              <Text style={styles.subtitle}>
                {isSignup
                  ? 'Create a new account to get started.'
                  : 'Sign in with your trusted identity provider to continue.'}
              </Text>
            </View>

            {/* OAuth Providers */}
            <View style={styles.providersContainer}>
              {providers.map(({ id, label, iconName, color }) => (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.providerButton,
                    loadingProvider === id && styles.providerButtonActive,
                  ]}
                  onPress={() => handleOAuthLogin(id)}
                  disabled={Boolean(loadingProvider)}
                >
                  <Ionicons name={iconName as any} size={20} color={color} />
                  <Text style={styles.providerButtonText}>
                    {loadingProvider === id ? 'Redirecting…' : label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email/Password Form */}
            <View style={styles.formContainer}>
              {isSignup && (
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#6e82a4"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!isLoading && !loadingProvider}
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#6e82a4"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading && !loadingProvider}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#6e82a4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading && !loadingProvider}
              />

              {isSignup && (
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>User Type:</Text>
                  <View style={styles.pickerButtons}>
                    {(['supplier', 'regulator', 'consumer'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.pickerButton,
                          userType === type && styles.pickerButtonActive,
                        ]}
                        onPress={() => setUserType(type)}
                      >
                        <Text
                          style={[
                            styles.pickerButtonText,
                            userType === type && styles.pickerButtonTextActive,
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (isLoading || loadingProvider) && styles.submitButtonDisabled,
                ]}
                onPress={handleEmailAuth}
                disabled={isLoading || Boolean(loadingProvider)}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#f4f8ff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isSignup ? 'Sign Up' : 'Log in with Email'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => {
                  setIsSignup(!isSignup);
                  setError(null);
                }}
              >
                <Text style={styles.toggleButtonText}>
                  {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#0f1624',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(20, 29, 45, 0.95)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(198, 218, 236, 0.15)',
    padding: 40,
    shadowColor: '#0c1428',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.45,
    shadowRadius: 60,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(70, 98, 171, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#e0f2fd',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#94aacd',
    textAlign: 'center',
  },
  providersContainer: {
    gap: 12,
    marginBottom: 12,
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(24, 35, 53, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 218, 236, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  providerButtonActive: {
    backgroundColor: 'rgba(70, 98, 171, 0.35)',
  },
  providerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e0f2fd',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.4)',
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#ffcccc',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(198, 218, 236, 0.15)',
  },
  dividerText: {
    fontSize: 13,
    color: '#6e82a4',
  },
  formContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: '#10192a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 218, 236, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#e0f2fd',
  },
  pickerContainer: {
    gap: 8,
  },
  pickerLabel: {
    fontSize: 13,
    color: '#94aacd',
    marginBottom: 4,
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#10192a',
    borderWidth: 1,
    borderColor: 'rgba(198, 218, 236, 0.2)',
    alignItems: 'center',
  },
  pickerButtonActive: {
    backgroundColor: 'rgba(70, 98, 171, 0.3)',
    borderColor: '#4662ab',
  },
  pickerButtonText: {
    fontSize: 13,
    color: '#94aacd',
    fontWeight: '500',
  },
  pickerButtonTextActive: {
    color: '#e0f2fd',
  },
  submitButton: {
    backgroundColor: '#4662ab',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4662ab',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 5,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4f8ff',
  },
  toggleButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 13,
    color: '#94aacd',
  },
});
