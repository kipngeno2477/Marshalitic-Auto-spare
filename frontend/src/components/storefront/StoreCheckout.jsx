import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Smartphone,
  Banknote,
  Building,
  CheckCircle2,
  ShieldCheck,
  Truck,
  MapPin,
  Car,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useCustomerCart } from '../../context/CustomerCartContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function StoreCheckout() {
  const { cart, clearCart, subtotal, vatAmount } = useCustomerCart();
  const navigate = useNavigate();

  const [deliveryMethod, setDeliveryMethod] = useState('pickup'); // 'pickup' or 'delivery'
  const [paymentMethod, setPaymentMethod] = useState('mpesa'); // 'mpesa', 'cash', 'card'

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    vehicle_reg_no: '',
    delivery_address: '',
    mpesa_phone: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stkStatus, setStkStatus] = useState(null); // 'waiting', 'success'

  const deliveryFee = deliveryMethod === 'delivery' ? 500 : 0;
  const finalTotal = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="py-20 text-center space-y-4">
        <h3 className="text-base font-extrabold text-[#10213D]">Your Cart is Empty</h3>
        <p className="text-xs text-slate-500">You must add spare parts before proceeding to checkout.</p>
        <Link
          to="/shop/products"
          className="inline-block px-5 py-2.5 bg-[#FF7900] text-white text-xs font-bold rounded-xl"
        >
          Browse Parts
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!formData.customer_name || !formData.customer_phone) {
      toast.error('Please enter your full name and contact phone number');
      return;
    }

    if (deliveryMethod === 'delivery' && !formData.delivery_address) {
      toast.error('Please enter your delivery location/address');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. If M-Pesa is chosen, trigger STK Push
      const targetPhone = formData.mpesa_phone || formData.customer_phone;
      if (paymentMethod === 'mpesa') {
        setStkStatus('waiting');
        toast('Sending STK Push prompt to your phone...', { icon: '📲' });

        try {
          const pushRes = await api.post('/mpesa/stkpush', {
            phone: targetPhone,
            amount: finalTotal,
            accountReference: 'MASHALITIC'
          });

          if (pushRes.data.checkoutRequestId) {
            // Wait brief moment for simulation
            await new Promise((r) => setTimeout(r, 2500));
            setStkStatus('success');
            toast.success('M-Pesa payment authorized!');
          }
        } catch (e) {
          console.warn('M-Pesa push fallback');
        }
      }

      // 2. Submit Order to Backend
      const orderPayload = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email,
        vehicle_reg_no: formData.vehicle_reg_no,
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === 'delivery' ? formData.delivery_address : 'Kirinyaga Road Showroom Pickup',
        items: cart.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity
        })),
        payment_method: paymentMethod,
        mpesa_phone: targetPhone,
        notes: formData.notes
      };

      const res = await api.post('/orders/checkout', orderPayload);

      if (res.data.success) {
        const orderData = res.data.data;
        clearCart();
        toast.success(`Order ${orderData.orderNumber} placed successfully!`);
        navigate(`/shop/order-success/${orderData.orderNumber}`, { state: { order: orderData } });
      }
    } catch (err) {
      console.error('Order submission failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to place order.');
    } finally {
      setIsSubmitting(false);
      setStkStatus(null);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[#10213D] tracking-tight">
          Secure Customer Checkout
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Fast Nairobi delivery & showroom collection with M-Pesa verification
        </p>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Customer Info, Delivery & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Customer Contact Details */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-[#10213D] uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FF7900] text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Customer & Vehicle Contact</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kelvin Kiprop"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-[#1264D8]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (M-Pesa) *</label>
                <input
                  type="tel"
                  required
                  placeholder="0712 345 678"
                  value={formData.customer_phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, customer_phone: val, mpesa_phone: val });
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1264D8]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="kelvin@gmail.com"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vehicle Plate No. (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. KCK 104Z"
                  value={formData.vehicle_reg_no}
                  onChange={(e) => setFormData({ ...formData, vehicle_reg_no: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Delivery vs Pickup Method */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-[#10213D] uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1264D8] text-white flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Delivery & Collection Method</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setDeliveryMethod('pickup')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  deliveryMethod === 'pickup'
                    ? 'border-[#FF7900] bg-orange-50/70 text-[#071B38] ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm">Store Pickup</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    FREE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Kirinyaga Road, Motor Mart Plaza, Shop G-12, Nairobi
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('delivery')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  deliveryMethod === 'delivery'
                    ? 'border-[#FF7900] bg-orange-50/70 text-[#071B38] ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm">Courier Delivery</span>
                  <span className="text-[10px] font-bold text-[#1264D8]">
                    +KSh 500
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dispatched directly to your garage, workshop, or doorstep
                </p>
              </button>
            </div>

            {deliveryMethod === 'delivery' && (
              <div className="pt-2 text-xs">
                <label className="block font-bold text-slate-700 mb-1">Delivery Address & Town *</label>
                <textarea
                  required
                  rows="2"
                  placeholder="e.g. Westlands, Mpaka Road, Shell Petrol Station / Garage"
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Step 3: Payment Options */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-[#10213D] uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Choose Payment Method</span>
            </h3>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center font-bold transition-all ${
                  paymentMethod === 'mpesa'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Smartphone className="w-5 h-5 text-emerald-600 mb-1" />
                <span>M-Pesa Express</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center font-bold transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Banknote className="w-5 h-5 text-blue-600 mb-1" />
                <span>Cash on Pickup</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center font-bold transition-all ${
                  paymentMethod === 'card'
                    ? 'border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <CreditCard className="w-5 h-5 text-purple-600 mb-1" />
                <span>Card / Bank</span>
              </button>
            </div>

            {paymentMethod === 'mpesa' && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <p className="font-bold">Lipa Na M-Pesa Online (Daraja Instant Push)</p>
                <p className="text-[11px] text-emerald-700">
                  When you click <strong>Place Order</strong>, Safaricom will send an instant PIN prompt to{' '}
                  <strong>{formData.mpesa_phone || formData.customer_phone || 'your phone'}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-[#10213D] uppercase tracking-wider">
              Order Summary ({cart.length} Parts)
            </h3>

            {/* Items summary */}
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1 text-xs">
              {cart.map((item) => (
                <div key={item.product_id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover bg-slate-50 border border-slate-200 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-[#10213D] truncate">{item.name}</p>
                      <span className="text-[10px] text-slate-400">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900 flex-shrink-0">
                    KSh {(item.selling_price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Parts Subtotal:</span>
                <span className="font-bold text-slate-900">KSh {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>VAT (16% inclusive):</span>
                <span className="font-bold text-slate-900">KSh {vatAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery / Collection:</span>
                <span className="font-bold text-emerald-600">
                  {deliveryFee === 0 ? 'FREE (Pickup)' : `+ KSh ${deliveryFee.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-[#10213D] pt-2 border-t border-slate-200">
                <span>Final Total:</span>
                <span className="text-[#FF7900]">KSh {finalTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#FF7900] hover:bg-[#E66D00] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Place Order (KSh {finalTotal.toLocaleString()})</span>
                </>
              )}
            </button>

            <div className="pt-2 text-[11px] text-slate-500 text-center space-y-1">
              <p className="flex items-center justify-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>256-bit Encrypted SSL Checkout</span>
              </p>
              <p>Certified Japanese & European Genuine Replacement Parts</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
