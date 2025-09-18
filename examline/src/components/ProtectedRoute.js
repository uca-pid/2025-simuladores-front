import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

// Component to protect routes that require authentication
export const ProtectedRoute = ({ children, allowedRoles = null, redirectTo = "/login" }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    // Redirect based on user role
    const roleRedirectMap = {
      'student': '/student-exam',
      'professor': '/principal',
      'system': '/principal'
    };
    
    const defaultRedirect = roleRedirectMap[user.rol] || '/login';
    return <Navigate to={defaultRedirect} replace />;
  }

  return children;
};

// Component specifically for professor-only routes
export const ProfessorRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['professor', 'system']}>
      {children}
    </ProtectedRoute>
  );
};

// Component specifically for student-only routes
export const StudentRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      {children}
    </ProtectedRoute>
  );
};

// Component for routes accessible by authenticated users regardless of role
export const AuthenticatedRoute = ({ children }) => {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
};