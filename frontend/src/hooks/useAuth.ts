import { useCallback, useEffect, useState } from 'react';
import { signIn as apiSignIn, signOut as apiSignOut, whoAmI } from '../services/api';

const TOKEN_KEY = 'ts-course-coach:auth-token:v1';
const EMAIL_KEY = 'ts-course-coach:auth-email:v1';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export interface AuthState {
  email: string | null;
  token: string | null;
  status: 'idle' | 'signing-in' | 'error';
  error: string | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [email, setEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem(EMAIL_KEY);
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<'idle' | 'signing-in' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Validate the persisted token on mount — if the server restarted or
  // sessions/ was wiped, quietly sign out so the UI is honest about state.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    whoAmI()
      .then((r) => {
        if (!alive) return;
        setEmail(r.email);
        try {
          localStorage.setItem(EMAIL_KEY, r.email);
        } catch {
          // ignore
        }
      })
      .catch(() => {
        if (!alive) return;
        setToken(null);
        setEmail(null);
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(EMAIL_KEY);
        } catch {
          // ignore
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (rawEmail: string) => {
    setStatus('signing-in');
    setError(null);
    try {
      const res = await apiSignIn(rawEmail);
      setToken(res.token);
      setEmail(res.email);
      try {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(EMAIL_KEY, res.email);
      } catch {
        // ignore
      }
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiSignOut();
    } catch {
      // ignore — client-side sign-out is what matters
    }
    setToken(null);
    setEmail(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { email, token, status, error, signIn, signOut };
}
