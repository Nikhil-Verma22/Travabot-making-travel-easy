import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for demo purposes
const MOCK_USER: User = {
  id: 'mock-user-id',
  email: 'demo@travabot.com',
  user_metadata: {},
  app_metadata: {},
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const storedSession = localStorage.getItem('travabot_session');
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setUser(parsed.user);
        setSession(parsed);
      } catch (e) {
        console.error('Failed to parse stored session:', e);
        localStorage.removeItem('travabot_session');
      }
    }
    setIsLoading(false);
  }, []);

  const signUp = async (email: string, password: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // For demo, just create a mock session
    const mockSession: Session = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      user: {
        ...MOCK_USER,
        email,
      },
    };
    
    localStorage.setItem('travabot_session', JSON.stringify(mockSession));
    setUser(mockSession.user);
    setSession(mockSession);
    
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // For demo, just create a mock session
    const mockSession: Session = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      user: {
        ...MOCK_USER,
        email,
      },
    };
    
    localStorage.setItem('travabot_session', JSON.stringify(mockSession));
    setUser(mockSession.user);
    setSession(mockSession);
    
    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem('travabot_session');
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
