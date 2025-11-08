'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { FaMicrosoft, FaIdCard } from 'react-icons/fa';
import { RiGovernmentFill } from 'react-icons/ri';
import * as topojson from 'topojson-client';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

const providers = [
  { id: 'google', label: 'Continue with Google', icon: FcGoogle },
  { id: 'azure', label: 'Continue with Microsoft', icon: FaMicrosoft },
  { id: 'cac-piv', label: 'CAC / PIV Smart Card Authentication', icon: FaIdCard },
  { id: 'login-gov', label: 'Login.gov SSO', icon: RiGovernmentFill },
] as const;

const accentDots = [
  { top: '12%', left: '12%', size: 6, outline: false },
  { top: '6%', left: '26%', size: 4, outline: true },
  { top: '18%', left: '38%', size: 5, outline: false },
  { top: '10%', left: '52%', size: 4, outline: true },
  { top: '4%', left: '64%', size: 3, outline: false },
  { top: '16%', left: '72%', size: 6, outline: true },
  { top: '8%', left: '84%', size: 4, outline: false },
  { top: '20%', left: '90%', size: 3, outline: true },
  { top: '14%', left: '18%', size: 3, outline: true },
  { top: '22%', left: '46%', size: 4, outline: false },
  { top: '26%', left: '68%', size: 5, outline: true },
  { top: '24%', left: '30%', size: 3, outline: false },
];

type ProviderId = (typeof providers)[number]['id'];

export default function LoginPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(null);
  const globeEl = useRef<any>(null);
  const [landData, setLandData] = useState<{ features: any[] }>({ features: [] });
  const [wavePhase, setWavePhase] = useState<'initial' | 'settled' | 'exit'>('initial');
  const [transitioning, setTransitioning] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'supplier' | 'regulator' | 'consumer'>('supplier');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/dashboard');
      }
    });
  }, [router, supabase]);

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas/land-110m.json')
      .then((res) => res.json())
      .then((landTopo) => {
        const featureCollection = topojson.feature(landTopo, landTopo.objects.land);
        setLandData(featureCollection as unknown as { features: any[] });
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWavePhase('settled');
    }, 80);

    return () => window.clearTimeout(timer);
  }, []);

  const triggerWaveExit = useCallback(() => {
    if (transitioning) return false;
    setTransitioning(true);
    setWavePhase('exit');
    return true;
  }, [transitioning]);

  const resetWaveIfNeeded = useCallback(() => {
    setTransitioning(false);
    setWavePhase('settled');
  }, []);

  const handleOAuthLogin = useCallback(
    async (provider: ProviderId) => {
      if (transitioning) return;
      setError(null);
      setLoadingProvider(provider);

      const started = triggerWaveExit();

      if (provider !== 'google' && provider !== 'azure') {
        window.setTimeout(() => {
          setError('This secure login option requires an approved hardware credential. Contact your administrator to proceed.');
          setLoadingProvider(null);
          resetWaveIfNeeded();
        }, 320);
        return;
      }

      const proceed = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) {
          setError(error.message);
          setLoadingProvider(null);
          resetWaveIfNeeded();
        }
      };

      if (started) {
        window.setTimeout(() => {
          void proceed();
        }, 480);
      } else {
        void proceed();
      }
    },
    [resetWaveIfNeeded, supabase, transitioning, triggerWaveExit]
  );

  const handleEmailLogin = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (transitioning || isLoading) return;
      setError(null);
      setIsLoading(true);

      try {
        if (isSignup) {
          // Handle signup
          const { data, error: signupError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                user_type: userType,
                roles: [userType], // Also store as roles array for compatibility
              },
            },
          });

          if (signupError) {
            setError(signupError.message);
            setIsLoading(false);
            return;
          }

          if (data.user) {
            // Successfully signed up
            setError(null);
            // Check if email confirmation is required
            if (data.session) {
              // Auto-logged in, redirect to dashboard
              router.push('/dashboard');
            } else {
              // Email confirmation required
              setError('Please check your email to confirm your account before signing in.');
              setIsSignup(false); // Switch back to login mode
            }
          }
        } else {
          // Handle login
          const { data, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (loginError) {
            setError(loginError.message);
            setIsLoading(false);
            return;
          }

          if (data.session) {
            // Successfully logged in
            router.push('/dashboard');
          }
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, fullName, userType, isSignup, supabase, router, transitioning, isLoading]
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0f1624] text-[#e0f2fd]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          right: '-45%',
          width: '120%',
          height: '120%',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      >
        <div className="h-full w-full">
          <Globe
            ref={globeEl}
            globeImageUrl={null}
            bumpImageUrl={null}
            backgroundImageUrl={null}
            showGlobe={false}
            showAtmosphere={false}
            backgroundColor="rgba(15,22,36,0)"
            polygonsData={landData.features}
            polygonCapColor={() => 'rgba(130, 130, 130, 0.45)'}
            polygonSideColor={() => 'rgba(0,0,0,0)'}
            polygonAltitude={0}
            polygonStrokeColor={() => 'rgba(255,255,255,0.35)'}
            showGraticules
            htmlElementsData={[]}
            onGlobeReady={() => {
              if (globeEl.current) {
                globeEl.current.pointOfView({ lat: 25, lng: 0, altitude: 0.6 });
                globeEl.current.controls().autoRotate = true;
                globeEl.current.controls().autoRotateSpeed = 1;
              }
            }}
          />
        </div>
      </div>

      <div className="relative z-30 flex min-h-screen items-center justify-center px-6 py-6 sm:py-10">
        <div className="w-full max-w-lg rounded-3xl border border-[rgba(198,218,236,0.15)] bg-[#141d2d]/95 shadow-[0_30px_60px_rgba(12,20,40,0.45)] p-10 space-y-8 backdrop-blur-md">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(70,98,171,0.2)]">
            {isSignup ? (
              <FiUserPlus className="h-7 w-7 text-[#c6daec]" />
            ) : (
              <FiLogIn className="h-7 w-7 text-[#c6daec]" />
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-wide">
            {isSignup ? 'Create Account' : 'Access Nautilink'}
          </h1>
          <p className="text-sm text-[#94aacd]">
            {isSignup
              ? 'Create a new account to get started.'
              : 'Sign in with your trusted identity provider to continue.'}
          </p>
        </div>

        <div className="space-y-3">
          {providers.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleOAuthLogin(id)}
              disabled={Boolean(loadingProvider) || transitioning}
              className={`w-full flex items-center justify-center gap-3 rounded-2xl border border-[rgba(198,218,236,0.2)] px-4 py-3 text-sm font-medium transition-all ${
                loadingProvider === id
                  ? 'bg-[rgba(70,98,171,0.35)] text-[#c6daec]'
                  : 'bg-[#182335]/80 hover:bg-[#1f2d43]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{loadingProvider === id ? 'Redirecting…' : label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 text-[#6e82a4] text-sm">
          <span className="flex-1 h-px bg-[rgba(198,218,236,0.15)]" />
          <span>or</span>
          <span className="flex-1 h-px bg-[rgba(198,218,236,0.15)]" />
        </div>

        <form className="space-y-3" onSubmit={handleEmailLogin}>
          {isSignup && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-[rgba(198,218,236,0.2)] bg-[#10192a] px-4 py-3 text-sm text-[#e0f2fd] placeholder-[#6e82a4] focus:outline-none focus:border-[#4662ab]"
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-2xl border border-[rgba(198,218,236,0.2)] bg-[#10192a] px-4 py-3 text-sm text-[#e0f2fd] placeholder-[#6e82a4] focus:outline-none focus:border-[#4662ab]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-2xl border border-[rgba(198,218,236,0.2)] bg-[#10192a] px-4 py-3 text-sm text-[#e0f2fd] placeholder-[#6e82a4] focus:outline-none focus:border-[#4662ab]"
          />
          {isSignup && (
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as 'supplier' | 'regulator' | 'consumer')}
              required
              className="w-full rounded-2xl border border-[rgba(198,218,236,0.2)] bg-[#10192a] px-4 py-3 text-sm text-[#e0f2fd] placeholder-[#6e82a4] focus:outline-none focus:border-[#4662ab] [&>option]:bg-[#10192a] [&>option]:text-[#e0f2fd]"
            >
              <option value="supplier">Supplier</option>
              <option value="regulator">Regulator</option>
              <option value="consumer">Consumer</option>
            </select>
          )}
          <button
            type="submit"
            disabled={transitioning || isLoading}
            className="w-full rounded-2xl bg-gradient-to-r from-[#4662ab] to-[#5f7bda] px-4 py-3 text-sm font-semibold text-[#f4f8ff] shadow-[0_10px_20px_rgba(70,98,171,0.35)] transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? 'Processing...'
              : isSignup
              ? 'Sign Up'
              : 'Log in with Email'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError(null);
            }}
            className="w-full text-sm text-[#94aacd] hover:text-[#c6daec] transition-colors"
          >
            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
      </div>

      {/* Floating accents */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-hidden transition-transform duration-[900ms] ease-[cubic-bezier(0.19,1,0.22,1)]"
        style={{
          transform:
            wavePhase === 'initial'
              ? 'translateY(10%)'
              : wavePhase === 'settled'
              ? 'translateY(0%)'
              : 'translateY(-135%)',
          height: wavePhase === 'exit' ? '140vh' : '32rem'
        }}
      >
        <div className="relative flex h-full w-full flex-col justify-end">
          <div className="absolute inset-x-0 top-0 h-3/5" />

          {accentDots.map(({ top, left, size, outline }, idx) => (
            <span
              key={idx}
              className={`absolute rounded-full ${outline ? 'border border-white/35 bg-transparent' : 'bg-white/60'}`}
              style={{ top, left, width: size, height: size, opacity: outline ? 0.6 : 0.85 }}
            />
          ))}

          <div className="relative h-full w-full">
            <svg viewBox="0 0 1440 600" className="absolute inset-x-0 bottom-0 w-full h-[55%]" preserveAspectRatio="none">
              <path
                d="M0 260L90 240C180 220 360 180 540 190C720 200 900 260 1080 280C1260 300 1440 280 1440 280V600H0Z"
                fill="#edf3ff"
              />
              <path
                d="M0 340L120 320C240 300 480 260 720 272C960 284 1200 348 1360 366L1440 376V600H0Z"
                fill="#ffffff"
                opacity="0.95"
              />
              <path
                d="M0 410L140 390C280 370 560 330 840 336C1120 342 1400 404 1440 414V600H0Z"
                fill="#f7faff"
                opacity="0.9"
              />
            </svg>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-40 bg-white transition-opacity duration-[750ms] ease-out"
        style={{ opacity: wavePhase === 'exit' ? 1 : 0 }}
      />
    </div>
  );
}

