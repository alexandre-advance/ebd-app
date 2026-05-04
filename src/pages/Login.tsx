import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Loader2, Mail, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

const logo = "https://qaccpjtjwuxhczkyafuo.supabase.co/storage/v1/object/public/Tecnecio%20LOGO/EBD%20Digital.png";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/dashboard'); // Placeholder for now
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-brand-800 p-8 rounded-2xl shadow-xl text-black"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src={logo}
              className="w-20 h-20 rounded-xl shadow-md object-contain bg-white"
            />
          </div>
          <h2 className="text-2xl font-bold text-white">EBD Digital</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="E-mail"
            labelClassName="text-white"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Senha"
            labelClassName="text-white"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-md border border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end">
            <Link 
              to="/forgot-password" 
              className="text-sm font-medium text-white hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-white text-brand-700 hover:bg-white/90 font-bold" 
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Entrar
          </Button>
        </form>

        <div className="mt-8 text-center border-t border-white/20 pt-6 space-y-3">
          <p className="text-sm text-white font-semibold">
            Precisa de ajuda? Entre em contato com a{' '}
            <span className="font-bold text-base">
              ikhaex
            </span>.
          </p>

          <div className="flex flex-col items-center gap-2 text-sm">

            <a
              href="mailto:contato@ikhaex.com.br"
              className="flex items-center gap-2 text-white hover:underline"
            >
              <Mail size={16} />
              contato@ikhaex.com.br
            </a>

            <a
              href="https://wa.me/5563992466202"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white hover:underline"
            >
              <MessageCircle size={16} />
              (63) 99246-6202
            </a>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
