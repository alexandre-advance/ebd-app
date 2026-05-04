import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/Button';
import { BookOpen, Users, BarChart3, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

const img1 = "https://ipjoswzdhfeovcdwlqbz.supabase.co/storage/v1/object/public/ikhaex/ikhaex-Logo.png";
const img2 = "https://ipjoswzdhfeovcdwlqbz.supabase.co/storage/v1/object/public/EBD-Logo/EBD%20Digital.png";

export default function Landing() {
      
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >

          {/* IMAGENS AQUI 👇 */}
          <div className="flex justify-center gap-8 mb-12">
            <img
              src={img1}
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl shadow-2xl object-cover hover:scale-105 transition duration-300"
              referrerPolicy="no-referrer"
            />
            <img
              src={img2}
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl shadow-2xl object-cover hover:scale-105 transition duration-300"
              referrerPolicy="no-referrer"
            />
          </div>

          <p className="text-lg text-black max-w-2xl mx-auto mb-10">
            Simplifique, acompanhe e gerencie sua igreja com a tecnologia da 
            <span className="font-bold text-brand-700"> ikhaex</span>.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto">Acessar Sistema</Button>
            </Link>
          </div>
        </motion.div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 border-t border-brand-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-black text-sm">
            © {new Date().getFullYear()} TC EBD Digital. Desenvolvido por <span className="font-bold text-brand-700">ikhaex.com.br</span>.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-200 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-brand-700 mb-3">{title}</h3>
      <p className="text-black leading-relaxed">{description}</p>
    </div>
  );
}
