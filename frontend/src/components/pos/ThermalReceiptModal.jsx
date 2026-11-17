import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle, Car } from 'lucide-react';

export default function ThermalReceiptModal({ isOpen, onClose, saleData }) {
  if (!isOpen || !saleData) return null;

  const receiptRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate simple text receipt download
    const content = `
========================================
       MASHALITIC AUTO SPARES
       Drive with Confidence.
  Kirinyaga Road, Motor Mart Plaza, G-12
        Nairobi, Kenya
     Tel: +254 712 345 678
     PIN: P051234567Z
========================================
INVOICE: ${saleData.invoiceNumber || 'INV-1046'}
DATE:    ${new Date().toLocaleString()}
CASHIER: Brian
CUSTOMER: ${saleData.customer_name || 'Walk-in Customer'}
========================================
ITEM                     QTY    AMOUNT
----------------------------------------
${(saleData.items || []).map(i => `${i.name.substring(0, 20).padEnd(22)} ${String(i.quantity).padStart(2)}  KSh ${(i.unit_price * i.quantity).toLocaleString().padStart(8)}`).join('\n')}
----------------------------------------
SUBTOTAL:                KSh ${Number(saleData.subtotal || 0).toLocaleString()}
VAT (16%):               KSh ${Number(saleData.vatAmount || 0).toLocaleString()}
TOTAL AMOUNT:            KSh ${Number(saleData.totalAmount || 0).toLocaleString()}
----------------------------------------
PAYMENT METHOD:          ${(saleData.payment_method || 'mpesa').toUpperCase()}
${saleData.mpesa_receipt ? `M-PESA REF:              ${saleData.mpesa_receipt}\n` : ''}${saleData.cash_tendered ? `CASH TENDERED:          KSh ${Number(saleData.cash_tendered).toLocaleString()}\nCHANGE DUE:             KSh ${Number(saleData.cash_change || 0).toLocaleString()}\n` : ''}========================================
  Thank you for choosing Mashalitic!
    Genuine Japanese & European Parts
    Quality Parts. Better Performance.
========================================
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${saleData.invoiceNumber || 'Sale'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Sale Completed</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm Thermal Receipt Layout */}
        <div id="thermal-receipt" ref={receiptRef} className="py-4 font-mono text-xs text-slate-800 leading-snug">
          {/* Business Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-400">
            <div className="flex justify-center mb-1">
              <Car className="w-6 h-6 text-[#FF7900]" />
            </div>
            <h2 className="text-sm font-black tracking-wider text-[#071B38] uppercase">
              MASHALITIC AUTO SPARES
            </h2>
            <p className="text-[10px] font-semibold italic text-slate-600">
              Drive with Confidence.
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Motor Mart Plaza, Shop G-12, Kirinyaga Rd
            </p>
            <p className="text-[10px] text-slate-500">Nairobi, Kenya | Tel: +254 712 345 678</p>
            <p className="text-[10px] text-slate-500">KRA PIN: P051234567Z</p>
          </div>

          {/* Invoice Meta */}
          <div className="py-2.5 border-b border-dashed border-slate-400 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">INVOICE:</span>
              <span className="font-bold text-slate-900">{saleData.invoiceNumber || 'INV-1046'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">DATE:</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CASHIER:</span>
              <span>Brian</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CUSTOMER:</span>
              <span className="font-semibold truncate max-w-[150px]">
                {saleData.customer_name || 'Walk-in Customer'}
              </span>
            </div>
          </div>

          {/* Line Items */}
          <div className="py-2.5 border-b border-dashed border-slate-400">
            <div className="grid grid-cols-12 font-bold text-[10px] uppercase text-slate-500 mb-1">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-4 text-right">Total</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              {(saleData.items || []).map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 items-baseline">
                  <span className="col-span-6 truncate font-medium">{it.name}</span>
                  <span className="col-span-2 text-center">{it.quantity}</span>
                  <span className="col-span-4 text-right font-bold">
                    KSh {(it.unit_price * it.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals */}
          <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>KSh {Number(saleData.subtotal || 0).toLocaleString()}</span>
            </div>
            {saleData.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount:</span>
                <span>- KSh {Number(saleData.discount).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>VAT (16%):</span>
              <span>KSh {Number(saleData.vatAmount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-300">
              <span>TOTAL:</span>
              <span>KSh {Number(saleData.totalAmount || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
            <div className="flex justify-between font-bold">
              <span>PAYMENT METHOD:</span>
              <span className="uppercase">{saleData.payment_method || 'M-PESA'}</span>
            </div>
            {saleData.mpesa_receipt && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>M-PESA RECEIPT:</span>
                <span>{saleData.mpesa_receipt}</span>
              </div>
            )}
            {saleData.cash_tendered && (
              <>
                <div className="flex justify-between">
                  <span>CASH TENDERED:</span>
                  <span>KSh {Number(saleData.cash_tendered).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-700">
                  <span>CHANGE DUE:</span>
                  <span>KSh {Number(saleData.cash_change || 0).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          {/* Barcode & Footer */}
          <div className="pt-3 text-center space-y-1">
            <div className="flex justify-center py-1">
              {/* Thermal Barcode representation */}
              <div className="flex items-center gap-0.5 h-8">
                {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2].map((w, i) => (
                  <div key={i} className="bg-black h-full" style={{ width: `${w * 1.5}px` }}></div>
                ))}
              </div>
            </div>
            <p className="text-[10px] font-mono tracking-widest">{saleData.invoiceNumber || 'INV-1046'}</p>
            <p className="text-[10px] text-slate-500 pt-1 font-sans">
              Genuine Japanese & European Parts Guaranteed.
            </p>
            <p className="text-[9px] text-slate-400 font-sans">Goods once sold are non-refundable after 7 days.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 no-print">
          <button
            onClick={handleDownload}
            className="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download</span>
          </button>

          <button
            onClick={handlePrint}
            className="py-2.5 px-3 rounded-xl bg-[#071B38] hover:bg-[#0D274D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-[#FF7900]" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
