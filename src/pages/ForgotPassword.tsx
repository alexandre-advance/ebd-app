import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { BookOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar link de recuperação.');
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
          <h2 className="text-2xl font-bold text-white">Recuperar Senha</h2>
          <p className="text-white opacity-60 mt-1">Enviaremos um link para o seu e-mail</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            <p className="text-white">
              Link enviado com sucesso! Verifique sua caixa de entrada.
            </p>
            <Link to="/login" className="block">
              <Button variant="outline" className="w-full border-white text-white hover:bg-white/10">Voltar para Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <Input
              label="E-mail"
              labelClassName="text-white"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              Enviar Link
            </Button>

            <div className="text-center">
              <Link 
                to="/login" 
                className="text-sm font-medium text-white hover:underline"
              >
                Voltar para Login
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
