import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token and user data from localStorage on app start
  useEffect(() => {
    const loadStoredAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(userData);
          
          // Validate token by checking if it's expired
          const tokenPayload = JSON.parse(atob(savedToken.split('.')[1]));
          const now = Date.now() / 1000;
          
          if (tokenPayload.exp && tokenPayload.exp < now) {
            // Token expired, try to refresh
            const refreshSuccess = await doRefreshToken(savedToken);
            if (!refreshSuccess) {
              // Failed to refresh, logout
              setToken(null);
              setUser(null);
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          }
        } catch (error) {
          console.error('Error parsing saved user data:', error);
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      setIsLoading(false);
    };

    loadStoredAuth();
  }, []); // Remove dependency to avoid circular calls

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Remove old localStorage keys if they exist
    localStorage.removeItem('name');
    localStorage.removeItem('userId');
    localStorage.removeItem('rol');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Also remove old localStorage keys
    localStorage.removeItem('name');
    localStorage.removeItem('userId');
    localStorage.removeItem('rol');
  };

  const doRefreshToken = async (currentToken) => {
    if (!currentToken) return false;

    try {
      const response = await fetch('http://localhost:4000/users/refresh-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        login(data.token, data.user);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
      return false;
    }
  };

  const refreshToken = async () => {
    return doRefreshToken(token);
  };

  // Set up automatic token refresh
  useEffect(() => {
    if (!token) return;

    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenPayload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expirationTime - now;
      
      // Refresh token 5 minutes before expiry
      const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000); // At least 1 minute

      const refreshTimer = setTimeout(() => {
        refreshToken();
      }, refreshTime);

      return () => clearTimeout(refreshTimer);
    } catch (error) {
      console.error('Error setting up token refresh:', error);
    }
  }, [token]);

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isLoading,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};