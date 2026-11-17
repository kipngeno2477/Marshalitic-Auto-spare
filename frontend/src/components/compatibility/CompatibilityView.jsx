import React, { useState, useEffect } from 'react';
import {
  Car,
  Search,
  CheckCircle2,
  Plus,
  Filter,
  ShoppingCart,
  Layers,
  ArrowRight,
  ShieldCheck,
  X,
  Gauge
} from 'lucide-react';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

export default function CompatibilityView() {
  const { addToCart } = useCart();

  const [makes, setMakes] = useState(['Toyota', 'Nissan', 'Subaru', 'Mazda', 'Mitsubishi']);
  const [vehicles, setVehicles] = useState([]);
  const [products, setProducts] = useState([]);

  // Search parameters
  const [selectedMake, setSelectedMake] = useState('Toyota');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('2012');
  const [textSearch, setTextSearch] = useState('');

  const [matchedParts, setMatchedParts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkProductId, setLinkProductId] = useState('');
  const [linkVehicleId, setLinkVehicleId] = useState('');
  const [linkNotes, setLinkNotes] = useState('Direct OEM replacement fitment');

  useEffect(() => {
    fetchVehicles();
    fetchProductsList();
  }, []);

  useEffect(() => {
    handleSearchCompatibility();
  }, [selectedMake, selectedModel, selectedYear]);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      if (res.data.success) {
        setVehicles(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load vehicles');
    }
  };

  const fetchProductsList = async () => {
    try {
      const res = await api.get('/products');
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load products');
    }
  };

  const handleSearchCompatibility = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedMake) params.make = selectedMake;
      if (selectedModel) params.model = selectedModel;
      if (selectedYear) params.year = selectedYear;
      if (textSearch) params.search = textSearch;

      const res = await api.get('/vehicles/search', { params });
      if (res.data.success) {
        setMatchedParts(res.data.data);
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkProductId || !linkVehicleId) {
      toast.error('Please select both product and vehicle');
      return;
    }
    try {
      const res = await api.post('/vehicles/link', {
        product_id: parseInt(linkProductId),
        vehicle_id: parseInt(linkVehicleId),
        notes: linkNotes
      });
      if (res.data.success) {
        toast.success('Compatibility rule linked successfully!');
        setShowLinkModal(false);
        handleSearchCompatibility();
      }
    } catch (err) {
      toast.error('Failed to link compatibility');
    }
  };

  // Filter models for currently selected make
  const availableModels = [
    ...new Set(
      vehicles
        .filter((v) => !selectedMake || v.make.toLowerCase() === selectedMake.toLowerCase())
        .map((v) => v.model)
    )
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#10213D] tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-[#FF7900]" />
            <span>Automotive Vehicle Compatibility Finder</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Search genuine parts by Vehicle Make, Model, Engine, and Model Year
          </p>
        </div>

        <button
          onClick={() => setShowLinkModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#071B38] hover:bg-[#0D274D] text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 text-[#FF7900]" />
          <span>Link Part to Vehicle</span>
        </button>
      </div>

      {/* Vehicle Selector Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#071B38] to-[#0A2652] text-white shadow-lg shadow-navy-950/20">
        <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400 mb-4 flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          <span>Select Customer Vehicle Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Make */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Manufacturer / Make</label>
            <select
              value={selectedMake}
              onChange={(e) => {
                setSelectedMake(e.target.value);
                setSelectedModel('');
              }}
              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#FF7900] backdrop-blur-md"
            >
              <option value="" className="text-slate-800">All Makes</option>
              {makes.map((m) => (
                <option key={m} value={m} className="text-slate-800">{m}</option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Vehicle Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#FF7900] backdrop-blur-md"
            >
              <option value="" className="text-slate-800">All Models</option>
              {availableModels.map((m) => (
                <option key={m} value={m} className="text-slate-800">{m}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Model Year</label>
            <input
              type="number"
              placeholder="e.g. 2012"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#FF7900] backdrop-blur-md"
            />
          </div>

          {/* Keyword Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Part Keyword</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Brake, Filter, Belt..."
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF7900] backdrop-blur-md"
              />
              <button
                onClick={handleSearchCompatibility}
                className="absolute right-2 top-2 p-1 text-orange-400 hover:text-white"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Matched Parts Results Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#10213D]">
            Guaranteed Compatible Spare Parts ({matchedParts.length} Found)
          </h4>
          <span className="text-xs text-slate-400">
            Filtered for: <strong className="text-slate-700">{selectedMake} {selectedModel} {selectedYear}</strong>
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Searching compatible parts database...
          </div>
        ) : matchedParts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs">
            <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h5 className="text-sm font-bold text-slate-800">No compatible parts recorded for this vehicle</h5>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Try selecting "All Models" or link a new spare part to this vehicle model using the button above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchedParts.map((part) => (
              <div
                key={part.id + (part.fitment_notes || '')}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={part.image_url || 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=200'}
                      alt={part.name}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-50 border border-slate-200 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[#FF7900] block">{part.category_name}</span>
                      <h5 className="text-xs font-bold text-[#10213D] leading-snug line-clamp-2">{part.name}</h5>
                      <span className="text-[11px] font-mono text-slate-400">{part.sku}</span>
                    </div>
                  </div>

                  {/* Compatibility Badge */}
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] space-y-1 mb-3">
                    <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                      <ShieldCheck className="w-4 h-4 text-[#1264D8]" />
                      <span>{part.matched_make} {part.matched_model} ({part.year_from} - {part.year_to})</span>
                    </div>
                    {part.fitment_notes && (
                      <p className="text-slate-600 text-[10px] pl-5.5">{part.fitment_notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Retail Price</span>
                    <span className="text-sm font-extrabold text-[#1264D8]">
                      KSh {Number(part.selling_price).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      addToCart(part, 1);
                      toast.success(`Added ${part.name} to order`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF7900] hover:bg-[#E66D00] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add to Order</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link Part to Vehicle Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-[#10213D]">Link Spare Part to Vehicle</h3>
              <button onClick={() => setShowLinkModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-4 py-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Spare Part</label>
                <select
                  required
                  value={linkProductId}
                  onChange={(e) => setLinkProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="">-- Choose Spare Part --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Vehicle Model</label>
                <select
                  required
                  value={linkVehicleId}
                  onChange={(e) => setLinkVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.year_from}-{v.year_to}) - {v.engine_capacity} {v.engine_type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fitment Notes / Axle Position</label>
                <input
                  type="text"
                  placeholder="e.g. Front axle brake caliper, 1NZ-FE engine oil filter"
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#071B38] hover:bg-[#0D274D] text-white font-extrabold"
                >
                  Save Compatibility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
