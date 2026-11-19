import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Car,
  Search,
  ShieldCheck,
  Truck,
  RotateCcw,
  Clock,
  ArrowRight,
  Star,
  CheckCircle2,
  ShoppingCart,
  Wrench,
  Sparkles,
  ChevronRight,
  PhoneCall,
  MapPin
} from 'lucide-react';
import { useCustomerCart } from '../../context/CustomerCartContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function StoreHome() {
  const { addToCart, setActiveVehicle } = useCustomerCart();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Vehicle Selector state
  const [makes, setMakes] = useState(['Toyota', 'Nissan', 'Subaru', 'Mazda', 'Mitsubishi']);
  const [selectedMake, setSelectedMake] = useState('Toyota');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('2014');

  useEffect(() => {
    fetchStorefrontData();
  }, []);

  const fetchStorefrontData = async () => {
    try {
      setLoading(true);
      const [prodsRes, vehRes] = await Promise.all([
        api.get('/products'),
        api.get('/vehicles')
      ]);

      if (prodsRes.data.success) {
        setProducts(prodsRes.data.data);
      }
      if (vehRes.data.success) {
        setVehicles(vehRes.data.data);
      }
    } catch (e) {
      console.warn('Failed to fetch products for storefront');
    } finally {
      setLoading(false);
    }
  };

  const availableModels = [
    ...new Set(
      vehicles
        .filter((v) => !selectedMake || v.make.toLowerCase() === selectedMake.toLowerCase())
        .map((v) => v.model)
    )
  ];

  const handleVehicleSearch = (e) => {
    e.preventDefault();
    if (selectedMake) {
      setActiveVehicle({
        make: selectedMake,
        model: selectedModel || 'All Models',
        year: selectedYear
      });
      navigate(
        `/shop/products?make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(
          selectedModel
        )}&year=${encodeURIComponent(selectedYear)}`
      );
    }
  };

  const categories = [
    { id: 1, name: 'Braking System', icon: '🛑', desc: 'Brake pads, discs, rotors & fluid', count: '45+ parts' },
    { id: 2, name: 'Engine & Filtration', icon: '🌪️', desc: 'Oil, air, fuel & cabin filters', count: '60+ parts' },
    { id: 3, name: 'Lubricants & Fluids', icon: '🛢️', desc: 'Synthetic motor oils, ATF & coolants', count: '30+ parts' },
    { id: 4, name: 'Ignition & Electrical', icon: '⚡', desc: 'Iridium spark plugs & coils', count: '40+ parts' },
    { id: 5, name: 'Car Batteries', icon: '🔋', desc: 'Chloride Exide maintenance-free batteries', count: '15+ models' },
    { id: 6, name: 'Suspension & Shocks', icon: '🚗', desc: 'KYB gas shocks, mountings & arms', count: '50+ parts' },
    { id: 7, name: 'Wipers & Visibility', icon: '🌧️', desc: 'Bosch Aerotwin all-weather blades', count: '25+ pairs' },
    { id: 8, name: 'Transmission & Clutch', icon: '⚙️', desc: 'Exedy clutch kits, wheel bearings & belts', count: '35+ parts' }
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SECTION WITH CARDS & VEHICLE FINDER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071B38] via-[#0D274D] to-[#040F20] text-white p-6 sm:p-10 lg:p-14 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF7900]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FF7900] text-xs font-black uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kenya's Trusted Automotive Spare Parts Hub</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
            Drive with Confidence. <br />
            <span className="text-[#FF7900]">Genuine Auto Spares</span> for Every Vehicle.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed font-normal">
            Order certified OEM and high-grade Japanese & European replacement parts. Fast delivery
            across Nairobi within hours, countrywide courier dispatch, and showroom pickup at Kirinyaga Road Plaza.
          </p>

          {/* Quick Vehicle Compatibility Search Box */}
          <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-orange-400 mb-3 flex items-center gap-2">
              <Car className="w-4 h-4" />
              <span>Select Your Car to Find Exact Fitting Parts</span>
            </h3>

            <form onSubmit={handleVehicleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Make</label>
                <select
                  value={selectedMake}
                  onChange={(e) => {
                    setSelectedMake(e.target.value);
                    setSelectedModel('');
                  }}
                  className="w-full px-3 py-2.5 bg-[#071B38] border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                >
                  {makes.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#071B38] border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                >
                  <option value="">All Models</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Year</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  placeholder="e.g. 2014"
                  className="w-full px-3 py-2.5 bg-[#071B38] border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#FF7900] hover:bg-[#E66D00] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Parts</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITION PILLARS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orange-50 text-[#FF7900]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#10213D]">100% Genuine Certified</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Toyota, Bosch, Denso OEM parts</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-[#1264D8]">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#10213D]">Fast Delivery Kenya-Wide</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Nairobi 2hr dispatch & courier</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#10213D]">Vehicle Fitment Guarantee</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Guaranteed compatibility or return</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#10213D]">M-Pesa Express Checkout</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Lipa Na M-Pesa STK Push instant</p>
          </div>
        </div>
      </section>

      {/* 3. BROWSE BY CATEGORY */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#10213D] tracking-tight">Shop by Auto Category</h2>
            <p className="text-xs text-slate-500">Premium replacement spare parts organized by vehicle systems</p>
          </div>
          <Link
            to="/shop/products"
            className="text-xs font-bold text-[#1264D8] hover:text-[#071B38] flex items-center gap-1 transition-colors"
          >
            <span>View All Categories</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/shop/products?category=${c.id}`}
              className="group p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#FF7900] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-3xl block mb-2">{c.icon}</span>
                <h4 className="text-xs sm:text-sm font-bold text-[#10213D] group-hover:text-[#FF7900] transition-colors">
                  {c.name}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{c.desc}</p>
              </div>
              <span className="text-[10px] font-extrabold text-[#1264D8] mt-3 block">{c.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. FEATURED SPARE PARTS CATALOG */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#10213D] tracking-tight">
              Best-Selling Spare Parts in Kenya
            </h2>
            <p className="text-xs text-slate-500">
              High-demand OEM parts for Toyota, Nissan, Subaru, and Mazda
            </p>
          </div>
          <Link
            to="/shop/products"
            className="text-xs font-bold text-[#1264D8] hover:text-[#071B38] flex items-center gap-1 transition-colors"
          >
            <span>See All Products</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading genuine auto parts...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.slice(0, 8).map((part) => (
              <div
                key={part.id}
                className="group rounded-2xl bg-white border border-slate-200/80 hover:border-[#FF7900]/50 hover:shadow-lg transition-all p-4 flex flex-col justify-between"
              >
                <div>
                  {/* Part Image */}
                  <div className="relative w-full h-44 rounded-xl bg-slate-50 overflow-hidden mb-3">
                    <img
                      src={part.image_url || 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=400'}
                      alt={part.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {part.quantity <= part.reorder_level && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[9px] uppercase tracking-wider">
                        Few Units Left
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] uppercase font-bold text-[#FF7900] block">{part.category_name}</span>
                  <Link
                    to={`/shop/product/${part.id}`}
                    className="text-xs sm:text-sm font-bold text-[#10213D] hover:text-[#1264D8] transition-colors line-clamp-2 leading-snug mt-1"
                  >
                    {part.name}
                  </Link>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 font-mono">
                    <span>SKU: {part.sku}</span>
                    <span>•</span>
                    <span className="text-slate-600 font-medium">{part.brand_name}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold block">Retail Price</span>
                    <span className="text-sm sm:text-base font-black text-[#1264D8]">
                      KSh {Number(part.selling_price).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => addToCart(part, 1)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#071B38] hover:bg-[#FF7900] text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. LOCATION & PICKUP CALLOUT */}
      <section className="rounded-3xl bg-slate-900 text-white p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs text-orange-400 font-bold uppercase tracking-wider">
            <MapPin className="w-4 h-4" />
            <span>Nairobi Showroom & Parts Depot</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Need Expert Part Fitment Advice?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Visit our shop on Kirinyaga Road, Motor Mart Plaza G-12 or call our master parts technicians.
            Bring your chassis number or vehicle logbook for guaranteed exact matching.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <a
            href="tel:+254712345678"
            className="px-5 py-3 rounded-2xl bg-[#FF7900] hover:bg-[#E66D00] text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call +254 712 345 678</span>
          </a>
          <Link
            to="/shop/products"
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <span>Browse Online Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
