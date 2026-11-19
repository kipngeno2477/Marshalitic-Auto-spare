import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Truck,
  Search,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Phone,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function StoreTrackOrder() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('query') || '';

  const [query, setQuery] = useState(initialQuery);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      handleTrack(initialQuery);
    }
  }, [initialQuery]);

  const handleTrack = async (searchTarget) => {
    const q = searchTarget || query;
    if (!q.trim()) {
      toast.error('Enter an Order Number or Phone Number');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/orders/track/${encodeURIComponent(q.trim())}`);
      if (res.data.success) {
        setOrderData(res.data.data);
      }
    } catch (err) {
      setOrderData(null);
      toast.error('No matching orders found. Check your reference number.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { name: 'Order Placed', status: 'completed' },
    { name: 'Depot Pick & Check', status: 'completed' },
    { name: 'Ready for Collection / Dispatch', status: 'current' },
    { name: 'Delivered / Completed', status: 'upcoming' }
  ];

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-[#10213D] tracking-tight">
          Track Your Auto Spares Order
        </h1>
        <p className="text-xs text-slate-500">
          Enter your Order Tracking Number (e.g. ORD-1045) or Customer Phone Number
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrack();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="e.g. ORD-1045 or 0712345678"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#FF7900] hover:bg-[#E66D00] text-white font-extrabold text-xs rounded-2xl shadow-md shadow-orange-500/25 active:scale-95 transition-all"
          >
            {loading ? 'Locating...' : 'Track Status'}
          </button>
        </form>
      </div>

      {/* Tracking Results */}
      {orderData && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Order Reference</span>
              <h2 className="text-lg font-black text-[#1264D8]">{orderData.order_number}</h2>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Order Date & Time</span>
              <p className="text-xs font-bold text-slate-800">{orderData.sale_date?.substring(0, 16).replace('T', ' ')}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="py-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Real-Time Fulfillment Status
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {steps.map((step, idx) => (
                <div
                  key={step.name}
                  className={`p-3 rounded-2xl border text-center ${
                    step.status === 'completed'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : step.status === 'current'
                      ? 'bg-orange-50 border-orange-300 text-orange-950 ring-2 ring-orange-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex justify-center mb-1">
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-[#FF7900]" />
                    )}
                  </div>
                  <span className="text-[11px] font-extrabold block leading-tight">{step.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Items breakdown */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Parts in This Consignment
            </h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
              {(orderData.items || []).map((it) => (
                <div key={it.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{it.product_name}</p>
                    <p className="text-[10px] text-slate-400">Qty: {it.quantity} • Unit: KSh {Number(it.unit_price).toLocaleString()}</p>
                  </div>
                  <span className="font-extrabold text-slate-900">
                    KSh {Number(it.total).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Support Notice */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800">Need Immediate Assistance?</span>
              <p className="text-[11px] text-slate-500">Contact our Kirinyaga Road customer care dispatch desk.</p>
            </div>
            <a
              href="tel:+254712345678"
              className="px-4 py-2 bg-[#071B38] text-white font-bold rounded-xl text-xs hover:bg-[#0D274D]"
            >
              Call Depot
            </a>
          </div>
        </div>
      )}

      {searched && !orderData && !loading && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-500 space-y-2">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Orders Found</h3>
          <p className="text-xs max-w-sm mx-auto">
            We could not find an order matching "{query}". Please verify the tracking number or call us on +254 712 345 678.
          </p>
        </div>
      )}
    </div>
  );
}
