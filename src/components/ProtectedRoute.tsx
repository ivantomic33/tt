import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, role, loading } = useAuth();

  // 1. Loading stanje
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#a855f7] animate-spin" />
          <p className="text-sm font-medium text-zinc-400">Proveravam autorizaciju...</p>
        </div>
      </div>
    );
  }

  // 2. Ako korisnik nije prijavljen -> preusmeri na /admin/login
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // 3. Ako korisnik nije administrator -> preusmeri na početnu stranu (/)
  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // 4. Korisnik je autorizovani administrator -> prikaži dečiji sadržaj
  return <>{children}</>;
};

export default ProtectedRoute;
