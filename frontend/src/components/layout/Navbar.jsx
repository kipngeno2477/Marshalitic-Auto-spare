import React, { useState, useEffect } from 'react';
import { Menu, Calendar, Bell, ChevronDown, CheckCircle2, XCircle, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [shopOpen, setShopOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Low Stock Alert', message: 'Car Battery is below reorder level (5 left)', time: '10m ago', unread: true },
    { id: 2, title: 'M-Pesa Received', message: 'Received KSh 8,500 for INV-1045', time: '1h ago', unread: false },
    { id: 3, title: 'Purchase Order', message: 'PO-2026-002 dispatched to Chloride Exide', time: '3h ago', unread: false }
  ]);

  // Formatted date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  const toggleShop = async () => {
    const next = !shopOpen;
    setShopOpen(next);
    try {
      await api.post('/dashboard/toggle-status', { status: next ? 'open' : 'closed' });
      toast.success(next ? 'Shop status set to OPEN' : 'Shop status set to CLOSED');
    } catch (e) {
      // Offline fallback
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80 shadow-sm sm:px-6">
      {/* Left: Mobile Toggle + Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 rounded-lg lg:hidden hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#10213D] tracking-tight leading-tight">
            Mashalitic Auto Spares
          </h2>
          <p className="hidden sm:block text-xs text-slate-500 font-medium">
            Sales & Inventory Management System
          </p>
        </div>
      </div>

      {/* Right Controls: Shop Status, Date, Notification, Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Shop Status Badge (Clickable) */}
        <button
          onClick={toggleShop}
          title="Click to toggle shop status"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            shopOpen
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
          }`}
        >
          {shopOpen ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Shop Open</span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Shop Closed</span>
            </>
          )}
        </button>

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayFormatted}</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 text-slate-500 rounded-full hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF7900] ring-2 ring-white"></span>
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] bg-orange-100 text-[#FF7900] font-bold px-2 py-0.5 rounded-full">3 New</span>
              </div>
              <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                    <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <span className="text-[9px] text-slate-400 mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-full sm:rounded-xl hover:bg-slate-100 transition-colors"
          >
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FF7900]/30"
            />
            <div className="hidden sm:block text-left">
              <span className="text-xs font-semibold text-[#10213D] block leading-tight">
                {user?.name ? user.name.split(' ')[0] : 'Brian'}
              </span>
              <span className="text-[10px] text-slate-400 capitalize block leading-none">
                {user?.role || 'Admin'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{user?.name || 'Brian'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@mashalitic.co.ke'}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/settings');
                }}
                className="flex items-center w-full gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Shop Settings</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                  navigate('/login');
                }}
                className="flex items-center w-full gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 border-t border-slate-100"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
