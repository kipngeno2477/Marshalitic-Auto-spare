import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Car,
  ShoppingCart,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Minus,
  Sparkles,
  PhoneCall,
  ChevronRight
} from 'lucide-react';
import { useCustomerCart } from '../../context/CustomerCartContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function StoreProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, setIsCartDrawerOpen } = useCustomerCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products/${id}`);
      if (res.data.success) {
        setProduct(res.data.data);
      }
    } catch (err) {
      toast.error('Product details not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      setIsCartDrawerOpen(true);
    }
  };

  const handleInstantBuy = () => {
    if (product) {
      addToCart(product, quantity);
      navigate('/shop/checkout');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        Loading product specifications and vehicle fitment rules...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-sm font-bold text-slate-800">Product not found</h3>
        <Link to="/shop/products" className="text-xs text-blue-600 underline mt-2 block">
          Back to parts catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/shop" className="hover:text-[#FF7900]">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/shop/products" className="hover:text-[#FF7900]">{product.category_name}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-slate-800 truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        {/* Left: Image Showcase (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="relative w-full h-80 sm:h-96 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
            <img
              src={product.image_url || 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=600'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Genuine OEM Part</span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Manufacturer / Brand:</span>
              <span className="font-bold text-slate-900">{product.brand_name}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>SKU / Part Code:</span>
              <span className="font-mono font-bold text-slate-900">{product.sku}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Barcode (UPC):</span>
              <span className="font-mono text-slate-700">{product.barcode}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Depot Shelf:</span>
              <span className="font-mono text-slate-700">{product.shelf_location || 'Main Showroom'}</span>
            </div>
          </div>
        </div>

        {/* Right: Pricing, Description & Action Buttons (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF7900] text-xs font-bold uppercase tracking-wider inline-block">
              {product.category_name}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#10213D] leading-tight">
              {product.name}
            </h1>

            {/* Stock status & Price */}
            <div className="flex items-baseline gap-4 pt-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1264D8]">
                KSh {Number(product.selling_price).toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-medium">VAT (16%) Included</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{product.quantity} Units In Stock (Kirinyaga Rd)</span>
              </span>
            </div>

            {/* Description */}
            <div className="pt-2">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Product Specifications
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {product.description ||
                  'High precision replacement auto spare part built to factory OEM tolerances. Restores factory vehicle efficiency, fuel economy, and handling safety.'}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Quantity:</span>
              <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-xs">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 text-xs font-bold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                className="py-3 px-5 rounded-2xl bg-[#071B38] hover:bg-[#0D274D] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-navy-950/20 active:scale-95 transition-all"
              >
                <ShoppingCart className="w-4 h-4 text-[#FF7900]" />
                <span>Add to Shopping Cart</span>
              </button>

              <button
                onClick={handleInstantBuy}
                className="py-3 px-5 rounded-2xl bg-[#FF7900] hover:bg-[#E66D00] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
              >
                <span>Instant Checkout with M-Pesa</span>
              </button>
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Nairobi Dispatch</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span>14-Day Fitment Swap</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>12 Mo Warranty</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guaranteed Compatible Vehicles Section */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-[#1264D8]">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#10213D]">
              Guaranteed Vehicle Compatibility List
            </h3>
            <p className="text-xs text-slate-500">
              This spare part has been verified to fit the following vehicle chassis and engine models
            </p>
          </div>
        </div>

        {(!product.compatibleVehicles || product.compatibleVehicles.length === 0) ? (
          <p className="text-xs text-slate-400 py-4">
            Universal fitment or compatibility data currently being cataloged. Call our mechanics at +254 712 345 678 for instant vehicle verification.
          </p>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-3 px-4">Manufacturer</th>
                  <th className="py-3 px-4">Vehicle Model</th>
                  <th className="py-3 px-4">Production Years</th>
                  <th className="py-3 px-4">Engine Specification</th>
                  <th className="py-3 px-4">Fitment Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {product.compatibleVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-[#10213D]">{v.make}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{v.model}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{v.year_from} - {v.year_to}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{v.engine_capacity} {v.engine_type}</td>
                    <td className="py-3 px-4 text-emerald-700 font-medium">
                      {v.compatibility_notes || 'Direct OEM drop-in replacement'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
