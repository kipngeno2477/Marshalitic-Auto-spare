import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Car, Lock, Mail, ArrowRight, ShieldCheck, Key } from 'lucide-react';

export default function LoginView() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@mashalitic.co.ke');
  const [password, setPassword] = useState('admin123');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/');
    }
  };

  const handleQuickLogin = async (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
    const success = await login(userEmail, userPass);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F3F6FC] selection:bg-[#FF7900] selection:text-white">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Brand Banner */}
        <div className="bg-[#071B38] text-white p-8 text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#FF7900]/20 blur-xl"></div>
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF7900] to-[#FFA726] flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Car className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-lg font-black tracking-wider uppercase">MASHALITIC AUTO SPARES</h1>
          <p className="text-xs text-[#FF7900] font-bold uppercase tracking-widest mt-0.5">
            Drive with Confidence.
          </p>
          <p className="text-[11px] text-slate-300 mt-2">
            Enterprise Sales, Inventory & Business Management System
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mashalitic.co.ke"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1264D8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1264D8]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#FF7900] hover:bg-[#E66D00] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 active:scale-95 transition-all mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2 text-center">
              Quick One-Click Demo Logins:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@mashalitic.co.ke', 'admin123')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 font-bold text-slate-800 text-left transition-colors"
              >
                <span className="block text-[#1264D8]">Brian (Admin)</span>
                <span className="text-[10px] text-slate-400 font-normal">Full System Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@mashalitic.co.ke', 'manager123')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 font-bold text-slate-800 text-left transition-colors"
              >
                <span className="block text-[#FF7900]">Sarah (Manager)</span>
                <span className="text-[10px] text-slate-400 font-normal">Reports & Purchases</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('cashier@mashalitic.co.ke', 'cashier123')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 font-bold text-slate-800 text-left transition-colors"
              >
                <span className="block text-emerald-600">Brian (Cashier)</span>
                <span className="text-[10px] text-slate-400 font-normal">POS & Checkout</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('store@mashalitic.co.ke', 'store123')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200 font-bold text-slate-800 text-left transition-colors"
              >
                <span className="block text-purple-600">David (Storekeeper)</span>
                <span className="text-[10px] text-slate-400 font-normal">Stock & Inbound</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
