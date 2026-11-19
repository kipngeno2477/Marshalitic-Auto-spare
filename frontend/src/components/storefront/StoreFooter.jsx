import React from 'react';
import { Link } from 'react-router-dom';
import { Car, MapPin, Phone, Mail, Clock, ShieldCheck, User } from 'lucide-react';

export default function StoreFooter() {
  return (
    <footer className="bg-[#071B38] text-white pt-12 pb-8 border-t border-white/10 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Col 1: Brand */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF7900] flex items-center justify-center text-white">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-black tracking-wider uppercase block">MASHALITIC</span>
              <span className="text-[10px] font-bold text-[#FF7900] uppercase tracking-widest block">AUTO SPARES</span>
            </div>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Your premier source for certified Japanese and European OEM automotive spare parts. Drive with Confidence.
          </p>
          <div className="pt-1">
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Genuine Guaranteed</span>
            </span>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Shop Departments</h4>
          <ul className="space-y-2 text-slate-400">
            <li><Link to="/shop/products?category=1" className="hover:text-white transition-colors">Brake Pads & Discs</Link></li>
            <li><Link to="/shop/products?category=2" className="hover:text-white transition-colors">Oil, Air & Fuel Filters</Link></li>
            <li><Link to="/shop/products?category=3" className="hover:text-white transition-colors">Valvoline Synthetic Oils</Link></li>
            <li><Link to="/shop/products?category=4" className="hover:text-white transition-colors">Denso Spark Plugs</Link></li>
            <li><Link to="/shop/products?category=5" className="hover:text-white transition-colors">Chloride Exide Batteries</Link></li>
            <li><Link to="/shop/products?category=6" className="hover:text-white transition-colors">KYB Gas Shock Absorbers</Link></li>
          </ul>
        </div>

        {/* Col 3: Customer Care & Services */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Customer Service</h4>
          <ul className="space-y-2 text-slate-400">
            <li><Link to="/shop/track" className="hover:text-white transition-colors">Track Order Live</Link></li>
            <li><Link to="/shop/products?tab=vehicle" className="hover:text-white transition-colors">Vehicle Compatibility Matrix</Link></li>
            <li><span className="text-slate-400">14-Day Part Return Policy</span></li>
            <li><span className="text-slate-400">Nairobi 2-Hour Courier Dispatch</span></li>
            <li><span className="text-slate-400">Countrywide Parcel Express (Easy Coach / Modern Coast)</span></li>
          </ul>
        </div>

        {/* Col 4: Depot Location */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Showroom Location</h4>
          <div className="space-y-2 text-slate-400 text-[11px]">
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#FF7900] flex-shrink-0 mt-0.5" />
              <span>Motor Mart Plaza, Shop G-12, Kirinyaga Road, Nairobi, Kenya</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#FF7900] flex-shrink-0" />
              <span>+254 712 345 678 / +254 709 888 000</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#FF7900] flex-shrink-0" />
              <span>sales@mashalitic.co.ke</span>
            </p>
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF7900] flex-shrink-0" />
              <span>Mon - Sat: 7:30 AM - 6:30 PM</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-2">
        <p>© 2026 MASHALITIC AUTO SPARES. All Rights Reserved. Drive with Confidence.</p>
        <Link
          to="/login"
          className="text-orange-400 hover:text-white flex items-center gap-1 font-semibold"
        >
          <User className="w-3.5 h-3.5" />
          <span>Staff ERP & POS Login</span>
        </Link>
      </div>
    </footer>
  );
}
