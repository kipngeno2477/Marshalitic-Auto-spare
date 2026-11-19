import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Car,
  ShoppingCart,
  Search,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  X,
  Menu,
  ChevronDown,
  User,
  Truck,
  Sparkles
} from 'lucide-react';
import { useCustomerCart } from '../../context/CustomerCartContext';

export default function StoreNavbar() {
  const { totalItemsCount, setIsCartDrawerOpen, activeVehicle, setActiveVehicle } = useCustomerCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/shop/products?search=${encodeURIComponent(navSearch.trim())}`);
    }
  };

  const navCategories = [
    { name: 'All Parts', path: '/shop/products' },
    { name: 'Braking System', path: '/shop/products?category=1' },
    { name: 'Engine & Filters', path: '/shop/products?category=2' },
    { name: 'Lubricants & Oils', path: '/shop/products?category=3' },
    { name: 'Suspension & Shocks', path: '/shop/products?category=6' },
    { name: 'Batteries', path: '/shop/products?category=5' },
    { name: 'Vehicle Compatibility', path: '/shop/products?tab=vehicle' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
      {/* Top Notification Bar */}
      <div className="bg-[#071B38] text-white text-[11px] py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FF7900]" />
              <span>Motor Mart Plaza, Kirinyaga Road, Nairobi</span>
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Mon - Sat: 7:30 AM - 6:30 PM</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <a href="tel:+254712345678" className="flex items-center gap-1 text-slate-200 hover:text-[#FF7900] transition-colors">
              <Phone className="w-3.5 h-3.5 text-[#FF7900]" />
              <span>Order Hotline: +254 712 345 678</span>
            </a>
            <span className="text-slate-500">|</span>
            <Link
              to="/login"
              className="text-orange-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <User className="w-3 h-3" />
              <span>Staff ERP Login</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/shop" className="flex items-center gap-3 flex-shrink-0 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF7900] to-[#FFA726] flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <Car className="w-7 h-7" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-black tracking-wider text-[#071B38] uppercase block leading-tight">
              MASHALITIC
            </span>
            <span className="text-[11px] font-bold text-[#FF7900] uppercase tracking-widest block leading-tight">
              AUTO SPARES
            </span>
            <span className="text-[9px] italic text-slate-400 hidden sm:block">
              Drive with Confidence
            </span>
          </div>
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-lg mx-2 relative">
          <input
            type="text"
            placeholder="Search spare parts by name, SKU (e.g. D2158), or car model..."
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF7900] focus:bg-white transition-all shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-4 py-1.5 bg-[#FF7900] hover:bg-[#E66D00] text-white text-xs font-extrabold rounded-xl transition-colors shadow-xs"
          >
            Search
          </button>
        </form>

        {/* Active Vehicle Badge / Change Selector */}
        {activeVehicle ? (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-950">
            <Car className="w-4 h-4 text-[#FF7900]" />
            <span>
              Fitting: <strong>{activeVehicle.make} {activeVehicle.model} ({activeVehicle.year})</strong>
            </span>
            <button
              onClick={() => setActiveVehicle(null)}
              title="Clear vehicle filter"
              className="p-0.5 text-orange-400 hover:text-orange-700 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            to="/shop/products?tab=vehicle"
            className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs font-bold text-[#1264D8] hover:bg-blue-100/70 transition-colors"
          >
            <Car className="w-4 h-4 text-[#1264D8]" />
            <span>Select Your Vehicle</span>
          </Link>
        )}

        {/* Right Actions: Track Order & Cart */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/shop/track"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Truck className="w-4 h-4 text-slate-500" />
            <span>Track Order</span>
          </Link>

          {/* Cart Button */}
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#071B38] hover:bg-[#0D274D] text-white text-xs font-black shadow-md shadow-navy-950/20 active:scale-95 transition-all"
            aria-label="View Shopping Cart"
          >
            <ShoppingCart className="w-4 h-4 text-[#FF7900]" />
            <span className="hidden sm:inline">My Cart</span>
            {totalItemsCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-black bg-[#FF7900] text-white rounded-full">
                {totalItemsCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 rounded-xl md:hidden hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Secondary Category Navigation Bar */}
      <nav className="hidden md:block bg-slate-50/80 border-t border-slate-200/60 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-6 overflow-x-auto py-2 text-xs font-bold text-slate-700">
          {navCategories.map((cat) => (
            <Link
              key={cat.name}
              to={cat.path}
              className="whitespace-nowrap hover:text-[#FF7900] transition-colors py-1"
            >
              {cat.name}
            </Link>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Genuine Certified Parts</span>
          </span>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 p-4 space-y-3 animate-in fade-in duration-150">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search spare parts..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          <div className="flex flex-col space-y-1.5 text-xs font-bold text-slate-800">
            {navCategories.map((c) => (
              <Link
                key={c.name}
                to={c.path}
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-50"
              >
                {c.name}
              </Link>
            ))}
            <Link
              to="/shop/track"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-50 text-blue-600"
            >
              Track Existing Order
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
