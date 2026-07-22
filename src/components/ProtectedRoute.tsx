import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/ui/Button';
import { AlertCircle, LogOut } from 'lucide-react';

import { Layout } from './Layout';

export function ProtectedRoute() {
  const { user, profile, church, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-800"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ADMIN_APP and ADMIN_MASTER bypass church subscription check
  if (profile?.role === 'ADMIN_APP' || profile?.role === 'ADMIN_MASTER') {
    return (
      <Layout>
        <Outlet />
      </Layout>
    );
  }

  // Subscription Validation Logic
  if (church) {
    const isStatusActive = church.subscription_status === 'active';
    const isNotExpired = church.subscription_expires_at 
      ? new Date(church.subscription_expires_at) >= new Date() 
      : false;

    if (!isStatusActive || !isNotExpired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-600 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-brand-800 mb-2">Acesso Bloqueado</h2>
            <p className="text-black mb-8">
              Assinatura inativa ou expirada. Entre em contato com o administrador da sua igreja ou com o suporte da ikhaex.
            </p>
            <div className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
              <Button variant="ghost" className="w-full text-black/50" onClick={signOut}>
                <LogOut size={18} className="mr-2" />
                Sair da Conta
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
