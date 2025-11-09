'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';
import { FiUser, FiLogIn } from 'react-icons/fi';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

interface AuthNavProps {
  isCollapsed?: boolean;
}

export default function AuthNav(props: AuthNavProps = {}) {
  const { isCollapsed = false } = props;
  const { user, error, isLoading } = useAuth();

  if (isLoading) return <div className="text-gray-400"></div>;
  if (error) return <div className="text-red-400">Error: {error.message}</div>;

  return (
    <div className="flex items-center space-x-4">
      {user ? (
        <>
          <HoverLogout name={"Welcome, " + user.name + "."} isCollapsed={isCollapsed} />
        </>
      ) : (
        <LoginButton isCollapsed={isCollapsed} />
      )}
    </div>
  );
}

function LoginButton({ isCollapsed }: { isCollapsed: boolean }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<number | null>(null);

  const loginText = 'Login';

  // Typewriter effect
  useEffect(() => {
    if (!isCollapsed && loginText) {
      setIsTyping(true);
      setDisplayedText('');
      let currentIndex = 0;
      
      const typeNextChar = () => {
        if (currentIndex < loginText.length) {
          setDisplayedText(loginText.slice(0, currentIndex + 1));
          currentIndex++;
          typingTimer.current = window.setTimeout(typeNextChar, 50); // 50ms delay between characters
        } else {
          setIsTyping(false);
        }
      };
      
      typingTimer.current = window.setTimeout(typeNextChar, 100); // Initial delay
    } else {
      setDisplayedText('');
      setIsTyping(false);
      if (typingTimer.current) {
        window.clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }
    }

    return () => {
      if (typingTimer.current) {
        window.clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }
    };
  }, [isCollapsed, loginText]);

  return (
    <Link 
      href="/login" 
      className={`flex items-center px-3 py-1 bg-white hover:bg-gray-300 text-black text-sm rounded transition-colors ${
        isCollapsed ? 'justify-center' : ''
      }`}
      title={isCollapsed ? 'Login' : undefined}
    >
      <FiLogIn className={`w-4 h-5 ${isCollapsed ? '' : 'mr-2'}`} />
      {!isCollapsed && (
        <span>
          {displayedText}
          {isTyping && <span className="animate-pulse">|</span>}
        </span>
      )}
    </Link>
  );
}

function HoverLogout({ name, isCollapsed = false }: { name: string; isCollapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [displayedName, setDisplayedName] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const typingTimer = useRef<number | null>(null);
  const supabase = getSupabaseBrowserClient();

  const onEnter = () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setOpen(true);
  };

  const onLeave = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 200);
  };

  // Typewriter effect
  useEffect(() => {
    if (!isCollapsed && name) {
      setIsTyping(true);
      setDisplayedName('');
      let currentIndex = 0;
      
      const typeNextChar = () => {
        if (currentIndex < name.length) {
          setDisplayedName(name.slice(0, currentIndex + 1));
          currentIndex++;
          typingTimer.current = window.setTimeout(typeNextChar, 50); // 50ms delay between characters
        } else {
          setIsTyping(false);
        }
      };
      
      typingTimer.current = window.setTimeout(typeNextChar, 100); // Initial delay
    } else {
      setDisplayedName('');
      setIsTyping(false);
      if (typingTimer.current) {
        window.clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }
    }

    return () => {
      if (typingTimer.current) {
        window.clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }
    };
  }, [isCollapsed, name]);

  return (
    <div className="relative whitespace-nowrap" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div className="flex items-center justify-left gap-3">
        {/* Profile Picture */}
        <img 
          src="/pfp.png" 
          alt="Profile" 
          className="w-10 h-10 rounded-full cursor-pointer"
          style={{
            border: '2px solid rgba(70, 98, 171, 0.5)',
            boxShadow: '0 2px 8px rgba(70, 98, 171, 0.3)',
            objectFit: 'cover'
          }}
        />
        {/* Name */}
        {
          !isCollapsed &&
          <span className="text-white text-sm cursor-default">
            {displayedName}
            {isTyping && <span className="animate-pulse">|</span>}
          </span>
        }
      </div>
      <div className={`absolute left-0 bottom-full mb-2 w-28 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.assign('/login');
          }}
          className="block w-full px-3 py-2 bg-black border border-white/20 text-white text-sm rounded hover:bg-white hover:text-black"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
