import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { BookOpen, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      alert('Senha atualizada com sucesso!');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-brand-800 p-8 rounded-2xl shadow-xl text-white"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-xl mb-4">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Nova Senha</h2>
          <p className="text-white opacity-60 mt-1">Defina sua nova senha de acesso</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Nova Senha"
            labelClassName="text-white"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirmar Senha"
            labelClassName="text-white"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-md border border-red-500/20">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-white text-brand-800 hover:bg-white/90" 
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Atualizar Senha
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
