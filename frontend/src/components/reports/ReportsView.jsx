import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Layers,
  ArrowRight,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState('pnl'); // 'pnl', 'performance', 'cashflow', 'movements'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [pnlData, setPnlData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [movementsData, setMovementsData] = useState([]);

  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      if (activeTab === 'pnl') {
        const res = await api.get('/reports/pnl', { params });
        if (res.data.success) setPnlData(res.data.data);
      } else if (activeTab === 'performance') {
        const res = await api.get('/reports/products', { params });
        if (res.data.success) setPerformanceData(res.data.data);
      } else if (activeTab === 'cashflow') {
        const res = await api.get('/reports/cashflow', { params });
        if (res.data.success) setCashFlowData(res.data.data);
      } else if (activeTab === 'movements') {
        const res = await api.get('/reports/stock-movements', { params });
        if (res.data.success) setMovementsData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load financial report data');
    } finally {
      setLoading(false);
    }
  };

  const exportCurrentReport = () => {
    if (activeTab === 'pnl' && pnlData) {
      const summaryRows = [
        { Metric: 'Gross Sales', 'Amount (KSh)': pnlData.summary.grossSales },
        { Metric: 'Customer Discounts', 'Amount (KSh)': -pnlData.summary.discounts },
        { Metric: 'Returns & Refunds', 'Amount (KSh)': -pnlData.summary.returns },
        { Metric: 'Net Revenue', 'Amount (KSh)': pnlData.summary.netRevenue },
        { Metric: 'Cost of Goods Sold (COGS)', 'Amount (KSh)': -pnlData.summary.cogs },
        { Metric: 'Gross Profit', 'Amount (KSh)': pnlData.summary.grossProfit },
        { Metric: 'Gross Margin %', 'Amount (KSh)': `${pnlData.summary.grossMarginPct}%` },
        { Metric: 'Operating Expenses', 'Amount (KSh)': -pnlData.summary.totalExpenses },
        { Metric: 'Net Profit', 'Amount (KSh)': pnlData.summary.netProfit },
        { Metric: 'Net Margin %', 'Amount (KSh)': `${pnlData.summary.netMarginPct}%` },
        { Metric: 'Total Invoices Processed', 'Amount (KSh)': pnlData.summary.invoiceCount }
      ];
      const ws = XLSX.utils.json_to_sheet(summaryRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Profit_and_Loss');
      XLSX.writeFile(wb, `Mashalitic_PnL_${new Date().toISOString().substring(0, 10)}.xlsx`);
      toast.success('P&L Report exported');
    } else if (activeTab === 'movements') {
      const ws = XLSX.utils.json_to_sheet(movementsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock_Movements');
      XLSX.writeFile(wb, `Mashalitic_Stock_Movements_${new Date().toISOString().substring(0, 10)}.xlsx`);
      toast.success('Stock movements exported');
    } else {
      toast.success('Report ready for printing/export');
    }
  };

  const COLORS = ['#1264D8', '#FF7900', '#10B981', '#7C3AED', '#EC4899', '#F59E0B'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#10213D] tracking-tight">Financial Reports & Analytics</h2>
          <p className="text-xs text-slate-500 font-medium">
            Accurate P&L accounting, Cost of Goods Sold (COGS), Cash Flow, and Stock Velocity
          </p>
        </div>

        <button
          onClick={exportCurrentReport}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Tabs & Date Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tab buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pnl' ? 'bg-white text-[#10213D] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profit & Loss (P&L)
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'performance' ? 'bg-white text-[#10213D] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Best vs Slow Moving
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cashflow' ? 'bg-white text-[#10213D] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cash Flow Ledger
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'movements' ? 'bg-white text-[#10213D] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Movement Audit
          </button>
        </div>

        {/* Date filter inputs */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-slate-500 hover:underline font-bold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PROFIT & LOSS */}
      {activeTab === 'pnl' && pnlData && (
        <div className="space-y-6">
          {/* KPI Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Net Sales Revenue</span>
              <p className="text-2xl font-black text-[#10213D]">
                KSh {pnlData.summary.netRevenue.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {pnlData.summary.invoiceCount} invoices processed
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cost of Goods Sold (COGS)</span>
              <p className="text-2xl font-black text-slate-700">
                KSh {pnlData.summary.cogs.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">Direct wholesale purchase cost</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Gross Profit</span>
              <p className="text-2xl font-black text-[#1264D8]">
                KSh {pnlData.summary.grossProfit.toLocaleString()}
              </p>
              <span className="text-[10px] font-bold text-blue-600 mt-1 block">
                Gross Margin: {pnlData.summary.grossMarginPct}%
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#071B38] to-[#0A2652] text-white shadow-md">
              <span className="text-[10px] uppercase font-bold text-orange-400 block mb-1">Net Operating Profit</span>
              <p className="text-2xl font-black text-white">
                KSh {pnlData.summary.netProfit.toLocaleString()}
              </p>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block">
                Net Margin: {pnlData.summary.netMarginPct}% (After {pnlData.summary.totalExpenses.toLocaleString()} expenses)
              </span>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <h4 className="text-sm font-bold text-[#10213D] mb-4">Official Income Statement (P&L Breakdown)</h4>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-2.5 font-bold text-slate-900">
                  <span>Gross Sales (Invoiced Products)</span>
                  <span>KSh {pnlData.summary.grossSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-slate-500 pl-4">
                  <span>Less: Sales Discounts</span>
                  <span className="text-rose-500">- KSh {pnlData.summary.discounts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-slate-500 pl-4">
                  <span>Less: Customer Returns & Refunds</span>
                  <span className="text-rose-500">- KSh {pnlData.summary.returns.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2.5 font-extrabold text-slate-900 bg-slate-50 px-3 rounded-lg">
                  <span>NET SALES REVENUE</span>
                  <span>KSh {pnlData.summary.netRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-slate-500 pl-4">
                  <span>Less: Cost of Goods Sold (Product Acquisition Cost)</span>
                  <span className="text-slate-800 font-bold">- KSh {pnlData.summary.cogs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2.5 font-extrabold text-[#1264D8] bg-blue-50/60 px-3 rounded-lg">
                  <span>GROSS PROFIT</span>
                  <span>KSh {pnlData.summary.grossProfit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-slate-500 pl-4">
                  <span>Less: Total Shop Operating Expenses</span>
                  <span className="text-rose-500 font-bold">- KSh {pnlData.summary.totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-3 font-black text-sm text-white bg-[#071B38] px-3 rounded-xl mt-2">
                  <span>NET BUSINESS PROFIT</span>
                  <span className="text-[#FF7900]">KSh {pnlData.summary.netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses Breakdown */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#10213D] mb-3">Expenses Breakdown</h4>
                <div className="space-y-2 text-xs">
                  {pnlData.expenseBreakdown.map((eb) => (
                    <div key={eb.category} className="flex justify-between items-center p-2 rounded-xl bg-slate-50">
                      <span className="font-semibold text-slate-700">{eb.category}</span>
                      <span className="font-bold text-slate-900">KSh {Number(eb.total_amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT PERFORMANCE (BEST VS SLOW) */}
      {activeTab === 'performance' && performanceData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Best Selling */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <h4 className="text-sm font-bold text-[#10213D] mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Top 10 Best-Selling Fast Moving Parts</span>
            </h4>
            <div className="divide-y divide-slate-100 text-xs">
              {performanceData.bestSelling.map((p, idx) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-400 w-4">{idx + 1}</span>
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.category_name} • {p.units_sold} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#1264D8] block">KSh {Number(p.total_revenue).toLocaleString()}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold block">Profit: KSh {Number(p.total_profit).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Slow Moving */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <h4 className="text-sm font-bold text-[#10213D] mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              <span>Slow-Moving / Low Turnover Stock</span>
            </h4>
            <div className="divide-y divide-slate-100 text-xs">
              {performanceData.slowMoving.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400">Shelf: {p.shelf_location || 'N/A'} • Stock: {p.current_stock} units</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                      {p.units_sold} sold in period
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CASH FLOW */}
      {activeTab === 'cashflow' && cashFlowData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Inflow (Collections)</span>
              <p className="text-2xl font-black text-emerald-600">KSh {cashFlowData.totalInflow.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">Sales & Customer Debt Settlements</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Outflow (Disbursements)</span>
              <p className="text-2xl font-black text-rose-600">KSh {cashFlowData.totalOutflow.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">Supplier Invoices + Operational Overheads</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#071B38] text-white shadow-md">
              <span className="text-[10px] uppercase font-bold text-orange-400 block mb-1">Net Cash Position</span>
              <p className="text-2xl font-black text-white">KSh {cashFlowData.netCashFlow.toLocaleString()}</p>
              <span className="text-[10px] text-blue-200 mt-1 block">Operational Liquidity</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK MOVEMENT AUDIT TRAIL */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#10213D]">Inventory Audit Ledger</h4>
            <span className="text-xs text-slate-400">{movementsData.length} movement records</span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Part Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-center">Movement Qty</th>
                  <th className="py-2.5 px-3 text-center">Prev → New</th>
                  <th className="py-2.5 px-3">Reference / Reason</th>
                  <th className="py-2.5 px-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movementsData.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-slate-500">{m.created_at?.substring(0, 16).replace('T', ' ')}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{m.product_name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        m.movement_type === 'sale'
                          ? 'bg-blue-100 text-blue-800'
                          : m.movement_type === 'purchase'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.movement_type === 'return_in'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#10213D]">{m.quantity}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                      {m.previous_quantity} → {m.new_quantity}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="font-semibold">{m.reference_id}</span> - {m.reason}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{m.user_name || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
