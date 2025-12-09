'use client';

import { useEffect, useCallback, useState } from 'react';
import Script from 'next/script';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';

/* -------------------------------------------------------------
   GLOBAL TYPE DECLARATION — VERCEL-SAFE
   (ONE unified version → avoids build conflicts)
------------------------------------------------------------- */
declare global {
  interface Window {
    handleGoogleSignIn?: (response: GoogleSignInResponse) => void;
    google?: any; // SAFE universal override
  }
}

/* -------------------------------------------------------------
   Google Sign-In Types
------------------------------------------------------------- */
interface GoogleSignInResponse {
  credential: string;
  clientId?: string;
  select_by?: string;
}

interface GoogleInitializeConfig {
  client_id: string | undefined;
  callback: ((response: GoogleSignInResponse) => void) | undefined;
  nonce?: string;
  use_fedcm?: boolean;
  context?: string;
  itp_support?: boolean;
}

interface GoogleButtonOptions {
  type?: string;
  theme?: string;
  size?: string;
  text?: string;
  shape?: string;
  logoAlignment?: string;
  width?: number;
}

interface GoogleNotification {
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
}

interface GoogleSignInProps {
  returnUrl?: string;
}

/* -------------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------- */
export default function GoogleSignIn({ returnUrl }: GoogleSignInProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [isLoading, setIsLoading] = useState(false);
  const { resolvedTheme } = useTheme();

  /* -------------------------------------------------------------
     HANDLER — Google → Supabase Login
  ------------------------------------------------------------- */
  const handleGoogleSignIn = useCallback(
    async (response: GoogleSignInResponse) => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        console.log('Starting Google sign in process');

        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        });

        if (error) throw error;

        console.log(
          'Google sign in successful, redirecting to:',
          returnUrl || '/dashboard'
        );

        setTimeout(() => {
          window.location.href = returnUrl || '/dashboard';
        }, 50);
      } catch (error) {
        console.error('Error signing in with Google:', error);
        setIsLoading(false);
      }
    },
    [returnUrl]
  );

  /* -------------------------------------------------------------
     INITIALIZE Google Identity Services
  ------------------------------------------------------------- */
  useEffect(() => {
    window.handleGoogleSignIn = handleGoogleSignIn;

    if (window.google && googleClientId) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSignIn,
        use_fedcm: true,
        context: 'signin',
        itp_support: true,
      });
    }

    return () => {
      delete window.handleGoogleSignIn;
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [googleClientId, handleGoogleSignIn]);

  /* -------------------------------------------------------------
     FALLBACK if no Google Client ID
  ------------------------------------------------------------- */
  if (!googleClientId) {
    return (
      <button
        disabled
        className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium rounded-full bg-background border border-border opacity-60 cursor-not-allowed"
      >
        Google Sign-In Not Configured
      </button>
    );
  }

  /* -------------------------------------------------------------
     RENDER
  ------------------------------------------------------------- */
  return (
    <>
      {/* Google One Tap container */}
      <div
        id="g_id_onload"
        data-client_id={googleClientId}
        data-context="signin"
        data-ux_mode="popup"
        data-auto_prompt="false"
        data-itp_support="true"
        data-callback="handleGoogleSignIn"
      />

      {/* Google Button Container */}
      <div id="google-signin-button" className="w-full h-12" />

      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.google && googleClientId) {
            const buttonContainer = document.getElementById(
              'google-signin-button'
            );

            if (buttonContainer) {
              window.google.accounts.id.renderButton(buttonContainer, {
                type: 'standard',
                theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'pill',
                logoAlignment: 'left',
                width: buttonContainer.offsetWidth,
              });

              setTimeout(() => {
                const googleButton =
                  buttonContainer.querySelector('div[role="button"]');
                if (googleButton instanceof HTMLElement) {
                  googleButton.style.borderRadius = '9999px';
                  googleButton.style.width = '100%';
                  googleButton.style.height = '56px';
                  googleButton.style.border = '1px solid var(--border)';
                  googleButton.style.background = 'var(--background)';
                  googleButton.style.transition = 'all 0.2s';
                }
              }, 100);
            }
          }
        }}
      />
    </>
  );
}
