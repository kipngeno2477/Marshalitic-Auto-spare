import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import {
  CheckCircle,
  Truck,
  MapPin,
  Printer,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Calendar
} from 'lucide-react';

export default function StoreOrderSuccess() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const order = location.state?.order;

  const handlePrint = () => {
    window.print();
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Mashalitic Auto Spares! I have placed order ${orderNumber}. Please confirm my spare parts preparation.`
  );

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
            Order Confirmed & Received
          </span>
          <h1 className="text-2xl font-black text-[#10213D] mt-1">
            Thank You for Choosing Mashalitic!
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Your auto spare parts order has been logged in our central warehouse management system.
          </p>
        </div>

        {/* Order Ref Badge */}
        <div className="inline-block px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Your Tracking Number:</span>
          <span className="text-xl font-mono font-black text-[#1264D8]">{orderNumber}</span>
        </div>

        {/* Order Details */}
        {order && (
          <div className="text-left text-xs bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-2 mt-4">
            <div className="flex justify-between text-slate-600">
              <span>Customer Name:</span>
              <span className="font-bold text-slate-900">{order.customerName}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Contact Phone:</span>
              <span className="font-mono font-bold text-slate-900">{order.customerPhone}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Collection / Delivery:</span>
              <span className="font-bold text-[#FF7900] uppercase">{order.deliveryMethod}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Location / Address:</span>
              <span className="font-semibold text-slate-800">{order.deliveryAddress}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
              <span>Total Paid / Payable:</span>
              <span className="font-black text-sm text-[#10213D]">
                KSh {Number(order.totalAmount).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <a
            href={`https://wa.me/254712345678?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Confirm via WhatsApp</span>
          </a>

          <button
            onClick={handlePrint}
            className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Receipt</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link to={`/shop/track?query=${orderNumber}`} className="font-bold text-[#1264D8] hover:underline">
            Track Order Live Progress →
          </Link>
          <Link to="/shop" className="font-bold text-slate-600 hover:text-slate-900">
            Back to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
