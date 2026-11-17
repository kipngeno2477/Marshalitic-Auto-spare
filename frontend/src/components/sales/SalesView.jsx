import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  Eye,
  Printer,
  RotateCcw,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  ArrowUpDown
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ThermalReceiptModal from '../pos/ThermalReceiptModal';
import * as XLSX from 'xlsx';

export default function SalesView() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);

  // Return Form State
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('Customer exchange/return');
  const [returnMethod, setReturnMethod] = useState('cash');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  useEffect(() => {
    fetchSales();
  }, [paymentFilter, statusFilter]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = {};
      if (paymentFilter) params.payment_method = paymentFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/sales', { params });
      if (res.data.success) {
        setSales(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load sales records');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSales();
  };

  const handleOpenDetails = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      if (res.data.success) {
        setSelectedSale(res.data.data);
        setShowDetailModal(true);
      }
    } catch (e) {
      toast.error('Error fetching sale details');
    }
  };

  const handleOpenReturn = async (sale) => {
    try {
      const res = await api.get(`/sales/${sale.id}`);
      if (res.data.success) {
        const fullSale = res.data.data;
        setSelectedSale(fullSale);
        setReturnItems(
          (fullSale.items || []).map((it) => ({
            product_id: it.product_id,
            name: it.product_name,
            unit_price: it.unit_price,
            max_qty: it.quantity,
            return_qty: 0,
            condition: 'restockable'
          }))
        );
        setShowReturnModal(true);
      }
    } catch (e) {
      toast.error('Could not prepare return items');
    }
  };

  const handleSubmitReturn = async () => {
    const activeReturns = returnItems.filter((i) => i.return_qty > 0);
    if (activeReturns.length === 0) {
      toast.error('Please specify at least 1 item quantity to return');
      return;
    }

    setSubmittingReturn(true);
    try {
      const payload = {
        sale_id: selectedSale.id,
        items: activeReturns.map((i) => ({
          product_id: i.product_id,
          quantity: i.return_qty,
          unit_price: i.unit_price,
          condition: i.condition
        })),
        reason: returnReason,
        refund_method: returnMethod
      };

      const res = await api.post('/sales/returns', payload);
      if (res.data.success) {
        toast.success(`Return processed: ${res.data.data.returnNumber}`);
        setShowReturnModal(false);
        fetchSales();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Return failed');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const exportSalesExcel = () => {
    if (sales.length === 0) {
      toast.error('No sales data to export');
      return;
    }

    const data = sales.map((s) => ({
      'Invoice #': s.invoice_number,
      'Customer': s.customer_name,
      'Date': s.sale_date,
      'Subtotal (KSh)': s.subtotal,
      'Discount (KSh)': s.discount_amount,
      'VAT (KSh)': s.vat_amount,
      'Total Amount (KSh)': s.total_amount,
      'Payment Method': s.payment_method.toUpperCase(),
      'Payment Status': s.payment_status.toUpperCase(),
      'Cashier': s.cashier_name
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales_Report');
    XLSX.writeFile(wb, `Mashalitic_Sales_${new Date().toISOString().substring(0, 10)}.xlsx`);
    toast.success('Sales report exported to Excel');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#10213D] tracking-tight">Sales Management</h2>
          <p className="text-xs text-slate-500 font-medium">Invoices, payment logs, and returns processing</p>
        </div>

        <button
          onClick={exportSalesExcel}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1264D8]"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Payment Methods</option>
            <option value="mpesa">M-Pesa</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank">Bank</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">
                    No sales matching criteria found.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#10213D]">{s.invoice_number}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {s.sale_date.substring(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{s.customer_name}</td>
                    <td className="py-3 px-4 text-slate-500">{s.item_count || 1} parts</td>
                    <td className="py-3 px-4 font-black text-[#10213D]">
                      KSh {Number(s.total_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          s.payment_method === 'mpesa'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.payment_method === 'cash'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {s.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] capitalize ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-600'
                            : s.status === 'returned'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(s.id)}
                          title="View Invoice"
                          className="p-1.5 text-slate-500 hover:text-[#1264D8] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setReceiptSale({
                              ...s,
                              invoiceNumber: s.invoice_number,
                              totalAmount: s.total_amount,
                              vatAmount: s.vat_amount,
                              subtotal: s.subtotal,
                              items: []
                            });
                          }}
                          title="Print Receipt"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {s.status === 'completed' && (
                          <button
                            onClick={() => handleOpenReturn(s)}
                            title="Process Return / Refund"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-[#10213D]">
                  Invoice {selectedSale.invoice_number}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedSale.sale_date.substring(0, 16).replace('T', ' ')} • Cashier: {selectedSale.cashier_name}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Payment Meta */}
            <div className="grid grid-cols-2 gap-4 py-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Customer Info</span>
                <p className="font-bold text-slate-800">{selectedSale.customer_name}</p>
                {selectedSale.customer_phone && <p className="text-slate-500">{selectedSale.customer_phone}</p>}
                {selectedSale.customer_vehicle && <p className="text-slate-500">Reg: {selectedSale.customer_vehicle}</p>}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Payment Status</span>
                <p className="font-bold text-slate-800 uppercase">{selectedSale.payment_method}</p>
                <p className="text-emerald-600 font-semibold capitalize">{selectedSale.payment_status}</p>
                {selectedSale.notes && <p className="text-slate-400 italic text-[11px] mt-1">{selectedSale.notes}</p>}
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Part Name</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedSale.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{it.product_name}</td>
                      <td className="py-2.5 px-3 text-center">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-right">KSh {Number(it.unit_price).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#10213D]">
                        KSh {Number(it.total).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal, VAT, Total */}
            <div className="space-y-1.5 text-xs text-right pr-2">
              <p className="text-slate-500">Subtotal: <span className="font-bold text-slate-800">KSh {Number(selectedSale.subtotal).toLocaleString()}</span></p>
              {selectedSale.discount_amount > 0 && (
                <p className="text-emerald-600 font-bold">Discount: - KSh {Number(selectedSale.discount_amount).toLocaleString()}</p>
              )}
              <p className="text-slate-500">VAT (16%): <span className="font-bold text-slate-800">KSh {Number(selectedSale.vat_amount).toLocaleString()}</span></p>
              <p className="text-base font-black text-[#10213D] pt-1">
                Total: <span className="text-[#FF7900]">KSh {Number(selectedSale.total_amount).toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Return & Refund Modal */}
      {showReturnModal && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-[#10213D]">Process Return / Refund</h3>
                <p className="text-xs text-slate-500">Invoice: {selectedSale.invoice_number}</p>
              </div>
              <button
                onClick={() => setShowReturnModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <p className="text-slate-600">
                Select parts to return and specify whether they can be restocked back to inventory.
              </p>

              <div className="space-y-2.5">
                {returnItems.map((item, idx) => (
                  <div key={item.product_id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500">KSh {Number(item.unit_price).toLocaleString()} • Bought: {item.max_qty}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-500">Return Qty:</label>
                      <input
                        type="number"
                        min="0"
                        max={item.max_qty}
                        value={item.return_qty}
                        onChange={(e) => {
                          const val = Math.min(item.max_qty, Math.max(0, parseInt(e.target.value) || 0));
                          setReturnItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, return_qty: val } : it))
                          );
                        }}
                        className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900"
                      />

                      <select
                        value={item.condition}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReturnItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, condition: val } : it))
                          );
                        }}
                        className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700"
                      >
                        <option value="restockable">Restock</option>
                        <option value="damaged">Damaged</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Return</label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Refund Method</label>
                <select
                  value={returnMethod}
                  onChange={(e) => setReturnMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="cash">Cash Refund</option>
                  <option value="mpesa">M-Pesa Refund</option>
                  <option value="credit_note">Store Credit / Credit Note</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReturn}
                disabled={submittingReturn}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/25"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Return</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {receiptSale && (
        <ThermalReceiptModal
          isOpen={Boolean(receiptSale)}
          onClose={() => setReceiptSale(null)}
          saleData={receiptSale}
        />
      )}
    </div>
  );
}
