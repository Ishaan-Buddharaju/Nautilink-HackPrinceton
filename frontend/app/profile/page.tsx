'use client';

import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

export default function Profile() {
  const { user, error, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-white">Error: {error.message}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div 
          className="max-w-md mx-auto rounded-lg p-6"
          style={{
            backgroundColor: 'rgba(23, 23, 23, 0.92)',
            border: '1px solid rgba(198, 218, 236, 0.35)',
            boxShadow: '0 8px 32px rgba(70, 98, 171, 0.25)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h1 
            className="text-2xl font-bold mb-4"
            style={{ 
              color: '#e0f2fd',
              borderBottom: '2px solid rgba(70, 98, 171, 0.5)',
              paddingBottom: '10px'
            }}
          >
            Not Logged In
          </h1>
          <p className="mb-4" style={{ color: '#b7c9e4' }}>
            You need to be logged in to view your profile.
          </p>
          <Link 
            href="/login" 
            className="inline-block px-4 py-2 rounded transition-all"
            style={{
              backgroundColor: 'rgba(70, 98, 171, 0.8)',
              color: '#e0f2fd',
              border: '1px solid rgba(198, 218, 236, 0.35)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(70, 98, 171, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(70, 98, 171, 0.8)';
            }}
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8" style={{marginLeft:"104px"}}>
      <div className="max-w-2xl mx-auto">
        <h1 
          className="text-3xl font-bold mb-8"
          style={{ 
            color: '#e0f2fd',
            borderBottom: '2px solid rgba(70, 98, 171, 0.5)',
            paddingBottom: '12px'
          }}
        >
          Profile
        </h1>
        
        <div 
          className="rounded-lg p-6 mb-6"
          style={{
            backgroundColor: 'rgba(23, 23, 23, 0.92)',
            border: '1px solid rgba(198, 218, 236, 0.35)',
            boxShadow: '0 8px 32px rgba(70, 98, 171, 0.25)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            gap: '24px',
            alignItems: 'flex-start'
          }}
        >
          {/* Left side - User information */}
          <div style={{ flex: 1 }}>
            <h2 
              className="text-xl font-semibold mb-4"
              style={{ 
                color: '#e0f2fd',
                borderBottom: '1px solid rgba(70, 98, 171, 0.3)',
                paddingBottom: '8px'
              }}
            >
              User Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm" style={{ color: '#9fb7d8', fontWeight: '600' }}>NAME</label>
                <p style={{ color: '#e0f2fd', marginTop: '4px' }}>{user.name || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm" style={{ color: '#9fb7d8', fontWeight: '600' }}>EMAIL</label>
                <p style={{ color: '#e0f2fd', marginTop: '4px' }}>{user.email || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm" style={{ color: '#9fb7d8', fontWeight: '600' }}>USER ID</label>
                <p className="font-mono text-sm" style={{ color: '#b7c9e4', marginTop: '4px' }}>{user.sub || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm" style={{ color: '#9fb7d8', fontWeight: '600' }}>BADGE ID</label>
                <p className="font-mono text-sm" style={{ color: '#b7c9e4', marginTop: '4px' }}>{user.sub ? `NTL-${user.sub.slice(-8).toUpperCase()}` : 'NTL-XXXXXXXX'}</p>
              </div>
              {user.roles && user.roles.length > 0 && (
                <div>
                  <label className="text-sm" style={{ color: '#9fb7d8', fontWeight: '600' }}>ROLES</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.roles.map((role, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 text-xs rounded"
                        style={{
                          backgroundColor: 'rgba(70, 98, 171, 0.2)',
                          border: '1px solid rgba(70, 98, 171, 0.4)',
                          color: '#e0f2fd'
                        }}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Profile picture (prominent) */}
          <div 
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '180px'
            }}
          >
            <img 
              src="/pfp.png" 
              alt="Profile" 
              className="rounded-full"
              style={{
                width: '140px',
                height: '140px',
                border: '3px solid rgba(70, 98, 171, 0.6)',
                boxShadow: '0 8px 24px rgba(70, 98, 171, 0.4)',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>

        <div 
          className="rounded-lg p-6"
          style={{
            backgroundColor: 'rgba(23, 23, 23, 0.92)',
            border: '1px solid rgba(198, 218, 236, 0.35)',
            boxShadow: '0 8px 32px rgba(70, 98, 171, 0.25)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h2 
            className="text-xl font-semibold mb-4"
            style={{ 
              color: '#e0f2fd',
              borderBottom: '1px solid rgba(70, 98, 171, 0.3)',
              paddingBottom: '8px'
            }}
          >
            Account Actions
          </h2>
          <div className="space-y-3">
            <Link 
              href="/auth/logout" 
              className="inline-block px-4 py-2 rounded transition-all"
              style={{
                backgroundColor: 'rgba(252, 3, 3, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(252, 3, 3, 0.5)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(191, 2, 2, 1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(252, 3, 3, 0.8)';
              }}
            >
              Logout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
