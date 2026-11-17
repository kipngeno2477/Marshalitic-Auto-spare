import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Car,
  Receipt,
  FileText,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Sales', path: '/sales', icon: ShoppingCart },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Compatibility', path: '/compatibility', icon: Car },
    { name: 'Purchases', path: '/purchases', icon: Truck },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Suppliers', path: '/suppliers', icon: Receipt },
    { name: 'Expenses', path: '/expenses', icon: DollarSign },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-[#071B38] text-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-center w-14 h-14 mb-2 rounded-2xl bg-gradient-to-tr from-[#FF7900] to-[#FFA726] shadow-lg shadow-[#FF7900]/30 text-white">
            <svg viewBox="0 0 48 48" className="w-10 h-10 fill-none stroke-current stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
              <path d="M6 30 C12 30 14 24 20 20 L28 20 C34 24 36 30 42 30" />
              <path d="M10 30 L6 30 C4.5 30 3 32 3 34 L3 36 C3 37.5 4.5 38 6 38 L42 38 C43.5 38 45 37.5 45 36 L45 34 C45 32 43.5 30 42 30" />
              <circle cx="13" cy="36" r="4" fill="white" />
              <circle cx="35" cy="36" r="4" fill="white" />
              <path d="M15 22 L20 13 L31 13 L36 22" />
            </svg>
          </div>
          <h1 className="text-base font-extrabold tracking-wider text-center text-white uppercase leading-tight">
            MASHALITIC
          </h1>
          <h2 className="text-xs font-bold tracking-widest text-[#FF7900] uppercase">
            AUTO SPARES
          </h2>
          <p className="text-[11px] italic text-blue-200/70 font-medium mt-0.5">
            Drive with Confidence
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-[#FF7900] text-white shadow-md shadow-[#FF7900]/25 font-semibold translate-x-1'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          <button
            onClick={handleLogout}
            className="flex items-center w-full gap-3.5 px-4 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 mt-4"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </nav>

        {/* Bottom Banner from Design: "Quality Parts. Better Performance." */}
        <div className="p-4 mx-3 mb-4 rounded-2xl bg-gradient-to-br from-[#0c244b] to-[#081830] border border-white/10 text-center relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-[#FF7900]/10 blur-xl"></div>
          <div className="flex justify-center mb-1">
            <Car className="w-7 h-7 text-[#FF7900]" />
          </div>
          <p className="text-xs font-bold text-white tracking-wide">
            Quality Parts.
          </p>
          <p className="text-[11px] text-[#FF7900] font-semibold">
            Better Performance.
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            v2.4 Pro Edition
          </div>
        </div>
      </aside>
    </>
  );
}
