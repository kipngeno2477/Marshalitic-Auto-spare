import React, { useState, useEffect, useRef } from 'react';
import { X, Barcode, Search, Check, Sparkles, Plus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function BarcodeScannerModal({ isOpen, onClose }) {
  const { addToCart } = useCart();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sampleBarcodes = [
    { code: '6001234567891', name: 'Ceramic Front Brake Pads (D2158)', price: 6000 },
    { code: '6001234567892', name: 'Genuine Spin-On Oil Filter', price: 1200 },
    { code: '6001234567893', name: 'Valvoline Advanced Synthetic 5W-30', price: 3500 },
    { code: '6001234567894', name: 'Denso Iridium Tough Spark Plug', price: 800 },
    { code: '6001234567896', name: 'Chloride Exide Maxima Battery', price: 12000 }
  ];

  const handleScanSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim()) return;

    setSearching(true);
    try {
      const res = await api.get(`/pos/products?barcode=${encodeURIComponent(barcodeInput.trim())}`);
      if (res.data.success && res.data.data.length > 0) {
        const product = res.data.data[0];
        addToCart(product, 1);
        toast.success(`Scanned: ${product.name}`);
        setBarcodeInput('');
        onClose();
      } else {
        toast.error(`No product found with barcode "${barcodeInput}"`);
      }
    } catch (err) {
      toast.error('Barcode search error');
    } finally {
      setSearching(false);
    }
  };

  const handleDirectSample = async (code) => {
    setBarcodeInput(code);
    setSearching(true);
    try {
      const res = await api.get(`/pos/products?barcode=${encodeURIComponent(code)}`);
      if (res.data.success && res.data.data.length > 0) {
        const product = res.data.data[0];
        addToCart(product, 1);
        toast.success(`Scanned: ${product.name}`);
        onClose();
      }
    } catch (e) {
      toast.error('Error scanning code');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-50 text-[#FF7900]">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#10213D]">Barcode Scanner</h3>
              <p className="text-[11px] text-slate-500">Scan or manually enter product barcode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Scanner Animation */}
        <div className="relative my-4 h-36 rounded-2xl bg-gradient-to-b from-[#071B38] to-[#040F20] overflow-hidden flex flex-col items-center justify-center border border-slate-800">
          {/* Laser scanning line animation */}
          <div className="absolute inset-x-4 top-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_#ff0000] animate-pulse"></div>
          <Barcode className="w-24 h-16 text-white/40" />
          <span className="text-[11px] font-mono text-slate-300 mt-2">
            Laser Beam Active - Ready for Barcode
          </span>
        </div>

        {/* Manual Barcode Input Form */}
        <form onSubmit={handleScanSubmit} className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Point scanner or type e.g. 6001234567891..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF7900] focus:bg-white"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-1.5 top-1.5 px-3 py-1 bg-[#FF7900] hover:bg-[#E66D00] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Lookup</span>
            </button>
          </div>
        </form>

        {/* Quick Test Barcode Pills */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Click to Simulate Scan:
          </span>
          <div className="space-y-1.5">
            {sampleBarcodes.map((item) => (
              <button
                key={item.code}
                onClick={() => handleDirectSample(item.code)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-100 text-left transition-colors group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-[#FF7900]">{item.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">{item.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#1264D8]">
                    KSh {item.price.toLocaleString()}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF7900]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
