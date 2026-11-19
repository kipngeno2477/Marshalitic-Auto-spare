import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { useCustomerCart } from '../../context/CustomerCartContext';

export default function StoreCartDrawer() {
  const {
    cart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    vatAmount
  } = useCustomerCart();

  const navigate = useNavigate();

  if (!isCartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-50 text-[#FF7900]">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#10213D]">Shopping Cart</h3>
                <p className="text-[11px] text-slate-500">{cart.length} item(s) selected</p>
              </div>
            </div>

            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Your cart is empty</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Browse our genuine Japanese & European auto parts catalog and add items for your vehicle.
                </p>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('/shop/products');
                  }}
                  className="mt-4 px-4 py-2 bg-[#FF7900] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#E66D00]"
                >
                  Browse Auto Parts
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="pt-3 flex gap-3 items-center">
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=200'}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-50 border border-slate-200 flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-[#10213D] leading-tight line-clamp-1">{item.name}</h5>
                    <span className="text-[10px] font-mono text-slate-400 block">{item.sku}</span>
                    <span className="text-xs font-extrabold text-[#1264D8] mt-0.5 block">
                      KSh {item.selling_price.toLocaleString()}
                    </span>

                    {/* Qty controls */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
                        <button
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="px-2 py-0.5 text-slate-500 hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="px-2 py-0.5 text-slate-500 hover:bg-slate-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-slate-400 hover:text-rose-500 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-black text-[#10213D]">
                      KSh {(item.selling_price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Call-to-Action */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-900">KSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT Component (16% incl.):</span>
                  <span className="font-bold text-slate-900">KSh {vatAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    <span>Store Pickup (Kirinyaga Rd):</span>
                  </span>
                  <span>FREE</span>
                </div>
                <div className="flex justify-between text-sm font-black text-[#10213D] pt-2 border-t border-slate-200">
                  <span>Total Due:</span>
                  <span className="text-base text-[#FF7900]">KSh {subtotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsCartDrawerOpen(false);
                  navigate('/shop/checkout');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-[#FF7900] hover:bg-[#E66D00] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
              >
                <span>Proceed to Secure Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>M-Pesa Express & Cash On Delivery Supported</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
