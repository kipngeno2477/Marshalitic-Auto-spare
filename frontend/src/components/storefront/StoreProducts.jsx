import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Car,
  Search,
  Filter,
  ShoppingCart,
  ShieldCheck,
  CheckCircle2,
  X,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { useCustomerCart } from '../../context/CustomerCartContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function StoreProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, activeVehicle, setActiveVehicle } = useCustomerCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters from URL or UI
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';
  const makeParam = searchParams.get('make') || (activeVehicle ? activeVehicle.make : '');
  const modelParam = searchParams.get('model') || (activeVehicle ? activeVehicle.model : '');
  const yearParam = searchParams.get('year') || (activeVehicle ? activeVehicle.year : '');

  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedMake, setSelectedMake] = useState(makeParam);
  const [selectedModel, setSelectedModel] = useState(modelParam);
  const [selectedYear, setSelectedYear] = useState(yearParam);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchFilteredProducts();
  }, [selectedCategory, selectedBrand, selectedMake, selectedModel, selectedYear]);

  const fetchMetadata = async () => {
    try {
      const [catsRes, brRes, vehRes] = await Promise.all([
        api.get('/products/categories'),
        api.get('/products/brands'),
        api.get('/vehicles')
      ]);
      if (catsRes.data.success) setCategories(catsRes.data.data);
      if (brRes.data.success) setBrands(brRes.data.data);
      if (vehRes.data.success) setVehicles(vehRes.data.data);
    } catch (e) {
      console.warn('Metadata load error');
    }
  };

  const fetchFilteredProducts = async () => {
    try {
      setLoading(true);
      // If vehicle make/model/year is set, use the specialized compatibility search
      if (selectedMake) {
        const params = {
          make: selectedMake,
          model: selectedModel || undefined,
          year: selectedYear || undefined,
          category_id: selectedCategory || undefined,
          search: searchQuery || undefined
        };
        const res = await api.get('/vehicles/search', { params });
        if (res.data.success) {
          setProducts(res.data.data);
        }
      } else {
        const params = {
          category: selectedCategory || undefined,
          brand: selectedBrand || undefined,
          search: searchQuery || undefined
        };
        const res = await api.get('/products', { params });
        if (res.data.success) {
          setProducts(res.data.data);
        }
      }
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFilteredProducts();
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedMake('');
    setSelectedModel('');
    setSelectedYear('');
    setSearchQuery('');
    setActiveVehicle(null);
    setSearchParams({});
  };

  const availableModels = [
    ...new Set(
      vehicles
        .filter((v) => !selectedMake || v.make.toLowerCase() === selectedMake.toLowerCase())
        .map((v) => v.model)
    )
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Page Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link to="/shop" className="hover:text-[#FF7900]">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-800">Auto Spare Parts Catalog</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-[#10213D] tracking-tight">
          Browse Genuine Auto Spares
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Filter by vehicle manufacturer, engine model, or parts category
        </p>
      </div>

      {/* Main Layout: Filters Sidebar + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Filter Sidebar (3 cols) */}
        <aside className="lg:col-span-3 space-y-5">
          {/* Vehicle Compatibility Filter Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#10213D] uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-4 h-4 text-[#FF7900]" />
                <span>Vehicle Filter</span>
              </h3>
              {(selectedMake || selectedModel || selectedYear) && (
                <button
                  onClick={() => {
                    setSelectedMake('');
                    setSelectedModel('');
                    setSelectedYear('');
                    setActiveVehicle(null);
                  }}
                  className="text-[10px] text-rose-600 font-bold hover:underline"
                >
                  Clear Car
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Make</label>
              <select
                value={selectedMake}
                onChange={(e) => {
                  setSelectedMake(e.target.value);
                  setSelectedModel('');
                  if (e.target.value) {
                    setActiveVehicle({ make: e.target.value, model: '', year: selectedYear });
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="">All Vehicle Makes</option>
                <option value="Toyota">Toyota</option>
                <option value="Nissan">Nissan</option>
                <option value="Subaru">Subaru</option>
                <option value="Mazda">Mazda</option>
                <option value="Mitsubishi">Mitsubishi</option>
              </select>
            </div>

            {selectedMake && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="">All Models</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedMake && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Model Year</label>
                <input
                  type="number"
                  placeholder="e.g. 2012"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-[#10213D] uppercase tracking-wider">
              Part Categories
            </h3>
            <div className="space-y-1.5 text-xs max-h-60 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                  !selectedCategory ? 'bg-[#FF7900] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(String(c.id))}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                    selectedCategory === String(c.id)
                      ? 'bg-[#FF7900] text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-[#10213D] uppercase tracking-wider">
              Brand / Manufacturer
            </h3>
            <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedBrand('')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                  !selectedBrand ? 'bg-[#1264D8] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Brands
              </button>
              {brands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBrand(String(b.id))}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                    selectedBrand === String(b.id)
                      ? 'bg-[#1264D8] text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleClearFilters}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
          >
            Clear All Filters
          </button>
        </aside>

        {/* Product Catalog Grid (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Top Search Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search catalog by part name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1264D8]"
              />
            </form>

            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
              {products.length} part(s) available
            </span>
          </div>

          {/* Active Fitment Notification Banner if vehicle is chosen */}
          {selectedMake && (
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="w-4 h-4 text-[#1264D8]" />
                <span>Showing parts compatible with: {selectedMake} {selectedModel || 'All Models'} ({selectedYear || 'Any Year'})</span>
              </div>
              <button
                onClick={() => setSelectedMake('')}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                Reset Vehicle
              </button>
            </div>
          )}

          {/* Product Cards Grid */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs">Filtering inventory catalog...</div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
              <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">No spare parts match this filter</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try selecting "All Models" or clear your search keyword to view all available components.
              </p>
              <button
                onClick={handleClearFilters}
                className="mt-4 px-4 py-2 bg-[#FF7900] text-white text-xs font-bold rounded-xl"
              >
                Show All Inventory
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="group rounded-2xl bg-white border border-slate-200/80 hover:border-[#FF7900]/40 hover:shadow-lg transition-all p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative w-full h-40 rounded-xl bg-slate-50 overflow-hidden mb-3">
                      <img
                        src={p.image_url || 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=400'}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <span className="text-[10px] uppercase font-bold text-[#FF7900] block">{p.category_name}</span>
                    <Link
                      to={`/shop/product/${p.id}`}
                      className="text-xs font-bold text-[#10213D] hover:text-[#1264D8] transition-colors line-clamp-2 leading-snug mt-1"
                    >
                      {p.name}
                    </Link>

                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 font-mono">
                      <span>{p.sku}</span>
                      <span>•</span>
                      <span className="text-slate-600 font-medium">{p.brand_name}</span>
                    </div>

                    {p.shelf_location && (
                      <span className="text-[10px] text-slate-400 block mt-1">Depot: {p.shelf_location}</span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold block">Price (VAT incl.)</span>
                      <span className="text-sm font-black text-[#1264D8]">
                        KSh {Number(p.selling_price).toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(p, 1)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#071B38] hover:bg-[#FF7900] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs active:scale-95"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
