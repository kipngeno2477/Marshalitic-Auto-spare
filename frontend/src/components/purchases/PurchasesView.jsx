import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  PackageCheck,
  X,
  Building,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function PurchasesView() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNewPoModal, setShowNewPoModal] = useState(false);
  const [receivingPo, setReceivingPo] = useState(null);

  // New PO form
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState([
    { product_id: '', ordered_qty: 10, unit_cost: '' }
  ]);

  // Receiving state
  const [receiveList, setReceiveList] = useState([]);

  useEffect(() => {
    fetchPurchases();
    fetchSuppliersAndProducts();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await api.get('/purchases');
      if (res.data.success) {
        setPurchases(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliersAndProducts = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products')
      ]);
      if (supRes.data.success) setSuppliers(supRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
    } catch (e) {
      console.warn('Error fetching suppliers and products');
    }
  };

  const handleAddItemRow = () => {
    setPoItems([...poItems, { product_id: '', ordered_qty: 10, unit_cost: '' }]);
  };

  const handleRemoveItemRow = (idx) => {
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (!supplierId || poItems.length === 0 || !poItems[0].product_id) {
      toast.error('Select supplier and at least 1 valid product');
      return;
    }

    try {
      const payload = {
        supplier_id: parseInt(supplierId),
        expected_date: expectedDate || null,
        notes,
        items: poItems.map((p) => ({
          product_id: parseInt(p.product_id),
          ordered_qty: parseInt(p.ordered_qty) || 1,
          unit_cost: parseFloat(p.unit_cost) || 0
        }))
      };

      const res = await api.post('/purchases', payload);
      if (res.data.success) {
        toast.success(`Purchase Order ${res.data.data.poNumber} created!`);
        setShowNewPoModal(false);
        fetchPurchases();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create PO');
    }
  };

  const handleOpenReceive = async (po) => {
    try {
      const res = await api.get(`/purchases/${po.id}`);
      if (res.data.success) {
        setReceivingPo(res.data.data);
        setReceiveList(
          (res.data.data.items || []).map((it) => ({
            item_id: it.id,
            product_id: it.product_id,
            name: it.product_name,
            ordered_qty: it.ordered_qty,
            received_so_far: it.received_qty,
            receive_now: Math.max(0, it.ordered_qty - it.received_qty)
          }))
        );
      }
    } catch (e) {
      toast.error('Could not load PO details');
    }
  };

  const handleSubmitReceive = async () => {
    try {
      const payload = {
        items: receiveList.map((i) => ({
          item_id: i.item_id,
          product_id: i.product_id,
          received_qty: parseInt(i.receive_now) || 0
        }))
      };

      const res = await api.post(`/purchases/${receivingPo.id}/receive`, payload);
      if (res.data.success) {
        toast.success('Stock received and inventory increased!');
        setReceivingPo(null);
        fetchPurchases();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive stock');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#10213D] tracking-tight">Purchase Management</h2>
          <p className="text-xs text-slate-500 font-medium">Supplier replenishment orders, inbound stock, and supplier payables</p>
        </div>

        <button
          onClick={() => setShowNewPoModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FF7900] hover:bg-[#E66D00] text-white rounded-xl text-xs font-extrabold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* PO Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Expected Date</th>
                <th className="py-3 px-4">Total Cost</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">Loading purchase orders...</td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">No purchase orders recorded yet.</td>
                </tr>
              ) : (
                purchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#10213D]">{po.po_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{po.supplier_name}</td>
                    <td className="py-3 px-4 text-slate-500">{po.order_date}</td>
                    <td className="py-3 px-4 text-slate-500">{po.expected_date || 'N/A'}</td>
                    <td className="py-3 px-4 font-black text-[#10213D]">
                      KSh {Number(po.total_cost).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          po.status === 'received'
                            ? 'bg-emerald-100 text-emerald-800'
                            : po.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] capitalize ${
                          po.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : po.payment_status === 'partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {po.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {po.status !== 'received' ? (
                        <button
                          onClick={() => handleOpenReceive(po)}
                          className="px-3 py-1 bg-[#071B38] hover:bg-[#0D274D] text-white rounded-lg font-bold text-[11px] shadow-xs"
                        >
                          Receive Goods
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Delivered</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Order Modal */}
      {showNewPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-[#10213D]">Create Supplier Purchase Order</h3>
              <button onClick={() => setShowNewPoModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Supplier *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.company_name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-bold text-slate-700">Spare Parts to Order</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[#1264D8] font-bold text-[11px] hover:underline"
                  >
                    + Add Another Part
                  </button>
                </div>

                <div className="space-y-2">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="col-span-6">
                        <select
                          required
                          value={item.product_id}
                          onChange={(e) => {
                            const pId = e.target.value;
                            const prod = products.find((p) => String(p.id) === pId);
                            setPoItems(
                              poItems.map((it, i) =>
                                i === idx ? { ...it, product_id: pId, unit_cost: prod ? prod.purchase_price : '' } : it
                              )
                            );
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Qty"
                          value={item.ordered_qty}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPoItems(poItems.map((it, i) => (i === idx ? { ...it, ordered_qty: val } : it)));
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Unit Cost (KSh)"
                          value={item.unit_cost}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPoItems(poItems.map((it, i) => (i === idx ? { ...it, unit_cost: val } : it)));
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Order Notes / Terms</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Deliver to Kirinyaga Road showroom bay 2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPoModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-[#FF7900] hover:bg-[#E66D00] text-white font-extrabold shadow-md shadow-orange-500/20"
                >
                  Create PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {receivingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-[#10213D]">Receive Stock for {receivingPo.po_number}</h3>
                <p className="text-xs text-slate-500">Supplier: {receivingPo.supplier_name}</p>
              </div>
              <button onClick={() => setReceivingPo(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <p className="text-slate-600">
                Verify delivered parts and quantities. Confirming receipt will automatically increment live warehouse inventory stock.
              </p>

              <div className="space-y-2">
                {receiveList.map((item, idx) => (
                  <div key={item.item_id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500">Ordered: {item.ordered_qty} • Prev Received: {item.received_so_far}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-bold text-slate-600">Receive Now:</label>
                      <input
                        type="number"
                        min="0"
                        value={item.receive_now}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setReceiveList(receiveList.map((it, i) => (i === idx ? { ...it, receive_now: val } : it)));
                        }}
                        className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReceivingPo(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReceive}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm"
              >
                Confirm Inbound Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
