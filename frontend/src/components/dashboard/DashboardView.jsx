import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  BarChart2,
  Trophy,
  ArrowRight,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  Clock,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  QrCode
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function DashboardView({ onOpenCheckout, onOpenBarcodeScanner }) {
  const {
    cartItems,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    subtotal,
    vatAmount,
    totalAmount
  } = useCart();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');

  // Dynamic Dashboard Stats
  const [stats, setStats] = useState({
    kpis: {
      todaySales: 12500,
      todaySalesTrend: '+12%',
      todayProfit: 4850,
      todayProfitTrend: '+15%',
      totalStockItems: 1248,
      stockTrend: '+0%',
      totalCustomers: 856,
      customerTrend: '+8%',
      lowStockCount: 1,
      pendingOrders: 1
    },
    salesOverview: [
      { name: 'Week 1', sales: 5200, profit: 2100 },
      { name: 'Week 2', sales: 9800, profit: 4200 },
      { name: 'Week 3', sales: 8500, profit: 3400 },
      { name: 'Week 4', sales: 18750, profit: 7850 }
    ],
    topSelling: [
      { id: 1, name: 'Brake Pads', sold_qty: 120, revenue: 720000, image_url: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=200' },
      { id: 2, name: 'Oil Filters', sold_qty: 98, revenue: 490000, image_url: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=200' },
      { id: 3, name: 'Engine Oil 5L', sold_qty: 75, revenue: 375000, image_url: 'https://images.unsplash.com/photo-1635784063748-0d19ca7bdf40?w=200' }
    ],
    recentSales: [
      { id: 1, invoice_number: 'INV-1045', customer_name: 'James Mwangi', sale_date: '2026-11-14 13:20:00', total_amount: 8500, payment_method: 'mpesa' },
      { id: 2, invoice_number: 'INV-1044', customer_name: 'Grace Wanjiku', sale_date: '2026-11-14 12:45:00', total_amount: 12000, payment_method: 'cash' },
      { id: 3, invoice_number: 'INV-1043', customer_name: 'Peter Otieno', sale_date: '2026-11-14 11:30:00', total_amount: 6800, payment_method: 'card' }
    ],
    stockAlerts: [
      { id: 6, name: 'Car Battery', quantity: 5, reorder_level: 8, image_url: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=200' }
    ]
  });

  // Fast POS Products Grid (matching screenshot)
  const [products, setProducts] = useState([
    { id: 1, name: 'Brake Pads', selling_price: 6000, quantity: 45, image_url: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=200' },
    { id: 2, name: 'Oil Filter', selling_price: 1200, quantity: 68, image_url: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=200' },
    { id: 3, name: 'Engine Oil 5L', selling_price: 3500, quantity: 32, image_url: 'https://images.unsplash.com/photo-1635784063748-0d19ca7bdf40?w=200' },
    { id: 4, name: 'Spark Plugs', selling_price: 800, quantity: 110, image_url: 'https://images.unsplash.com/photo-1598449356475-b9f71db7d847?w=200' },
    { id: 5, name: 'Air Filter', selling_price: 1000, quantity: 55, image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=200' },
    { id: 6, name: 'Car Battery', selling_price: 12000, quantity: 5, image_url: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=200' },
    { id: 7, name: 'Shock Absorber', selling_price: 8000, quantity: 18, image_url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=200' },
    { id: 8, name: 'Wiper Blades', selling_price: 1200, quantity: 40, image_url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=200' }
  ]);

  // Fetch real data from backend
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, prodsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/products')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (prodsRes.data.success && prodsRes.data.data.length > 0) {
        setProducts(prodsRes.data.data.slice(0, 8));
      }
    } catch (e) {
      console.warn('Backend currently unreachable, using initialized data model');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP KPI CARDS (Blue, Green, Orange, Purple) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-r from-[#1264D8] to-[#0284c7] shadow-lg shadow-blue-500/15">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
              {stats.kpis.todaySalesTrend}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-blue-100">Today's Sales</p>
            <h3 className="text-2xl font-black tracking-tight mt-0.5">
              KSh {stats.kpis.todaySales.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Card 2: Total Stock Items */}
        <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-r from-[#10B981] to-[#059669] shadow-lg shadow-emerald-500/15">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
              {stats.kpis.stockTrend}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-emerald-100">Total Stock Items</p>
            <h3 className="text-2xl font-black tracking-tight mt-0.5">
              {stats.kpis.totalStockItems.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Card 3: Total Customers */}
        <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-r from-[#FF7900] to-[#EA580C] shadow-lg shadow-orange-500/15">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
              {stats.kpis.customerTrend}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-orange-100">Total Customers</p>
            <h3 className="text-2xl font-black tracking-tight mt-0.5">
              {stats.kpis.totalCustomers.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Card 4: Total Profit */}
        <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-r from-[#7C3AED] to-[#6366F1] shadow-lg shadow-indigo-500/15">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
              <BarChart2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
              {stats.kpis.todayProfitTrend}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-purple-100">Total Profit</p>
            <h3 className="text-2xl font-black tracking-tight mt-0.5">
              KSh {stats.kpis.todayProfit.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW: Sales Overview | Top Selling Items | Promo Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sales Overview Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-[#1264D8]">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#10213D]">Sales Overview</h4>
            </div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#1264D8]"
            >
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Year">This Year</option>
            </select>
          </div>

          <div className="relative h-56 w-full">
            {/* Tooltip callout badge e.g. KSh 18,750 matching screenshot */}
            <div className="absolute top-2 right-4 z-10 px-2.5 py-1 bg-[#1264D8] text-white text-xs font-bold rounded-lg shadow-md shadow-blue-500/20">
              KSh 18,750
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.salesOverview} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1264D8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1264D8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  formatter={(value) => [`KSh ${value.toLocaleString()}`, 'Sales']}
                  contentStyle={{ backgroundColor: '#071B38', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#FF7900' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#1264D8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                  dot={{ r: 4, fill: '#1264D8', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#FF7900', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Items (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Trophy className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#10213D]">Top Selling Items</h4>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-semibold text-[#1264D8] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3.5 my-auto">
            {stats.topSelling.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-400 w-3">{idx + 1}</span>
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-[#10213D] leading-tight">{item.name}</h5>
                    <p className="text-[11px] text-slate-500 font-medium">{item.sold_qty} sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#1264D8]">
                    KSh {item.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Promotional Banner (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl p-5 bg-gradient-to-br from-[#071B38] via-[#092348] to-[#040F20] text-white flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-[#FF7900]/20 blur-2xl"></div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF7900] block mb-1">
              MASHALITIC AUTO SPARES
            </span>
            <h4 className="text-lg font-black leading-tight text-white">
              Keep Your Ride On The Road!
            </h4>
          </div>

          <div className="my-3 flex justify-center">
            <img
              src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400"
              alt="Automotive"
              className="w-full h-24 object-cover rounded-xl shadow-md border border-white/10"
            />
          </div>

          <button
            onClick={() => navigate('/sales')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#FF7900] hover:bg-[#E66D00] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#FF7900]/30 active:scale-95"
          >
            <span>Shop Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. LOWER SECTION: New Sale Product Grid | Current Order Cart | Recent Sales & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: New Sale Product Grid (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-50 text-[#FF7900]">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#10213D]">New Sale</h4>
            </div>

            <button
              onClick={onOpenBarcodeScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#071B38] text-white text-xs font-semibold hover:bg-[#0D274D] transition-colors shadow-sm"
            >
              <Barcode className="w-3.5 h-3.5 text-[#FF7900]" />
              <span>Scan Barcode</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1264D8] focus:bg-white transition-all"
            />
          </div>

          {/* 2x4 Product Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => addToCart(p, 1)}
                className="group flex flex-col items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100 hover:border-[#FF7900]/40 hover:shadow-md hover:shadow-orange-500/10 cursor-pointer transition-all active:scale-95"
              >
                <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden mb-2">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <h6 className="text-[11px] font-bold text-[#10213D] text-center line-clamp-1 leading-tight">
                  {p.name}
                </h6>
                <span className="text-[11px] font-extrabold text-[#1264D8] mt-1">
                  KSh {p.selling_price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Current Order (Cart) (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-[#1264D8]">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-[#10213D]">Current Order</h4>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                {cartItems.reduce((acc, it) => acc + it.quantity, 0)} Items
              </span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
              {cartItems.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">Cart is empty. Click any product to add.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-9 h-9 rounded-lg object-cover bg-white border border-slate-200 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h6 className="text-xs font-bold text-[#10213D] truncate">{item.name}</h6>
                        <span className="text-[11px] text-[#1264D8] font-bold">
                          KSh {item.selling_price.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-[#10213D]">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Subtotal, VAT, Total & Checkout Actions */}
          <div className="pt-3 border-t border-slate-100 mt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span className="font-bold text-[#10213D]">KSh {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>VAT (16%)</span>
              <span className="font-bold text-[#10213D]">KSh {vatAmount.toLocaleString()}</span>
            </div>

            {/* Total Highlight Bar in Orange */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#FF7900] to-[#FFA726] text-white shadow-md shadow-orange-500/20">
              <span className="text-xs font-bold uppercase tracking-wider">Total</span>
              <span className="text-base font-black">KSh {totalAmount.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={clearCart}
                disabled={cartItems.length === 0}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Clear</span>
              </button>

              <button
                onClick={onOpenCheckout}
                disabled={cartItems.length === 0}
                className="col-span-2 py-2.5 px-4 rounded-xl bg-[#FF7900] hover:bg-[#E66D00] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-[#FF7900]/25 transition-all active:scale-95 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>Process Sale</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Stacked Recent Sales & Stock Alerts (3 cols) */}
        <div className="lg:col-span-3 space-y-5 flex flex-col justify-between">
          {/* Recent Sales Box */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-[#10213D]">Recent Sales</h4>
              </div>
              <button
                onClick={() => navigate('/sales')}
                className="text-[11px] font-semibold text-[#1264D8] hover:underline flex items-center gap-0.5"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {stats.recentSales.map((s) => (
                <div
                  key={s.id}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-extrabold text-[#10213D] block text-[11px]">{s.invoice_number}</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">
                      {s.sale_date.substring(5, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#10213D] block text-[11px]">
                      KSh {Number(s.total_amount).toLocaleString()}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5 uppercase ${
                        s.payment_method === 'mpesa'
                          ? 'bg-emerald-100 text-emerald-700'
                          : s.payment_method === 'cash'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {s.payment_method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Alerts Box */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#FF7900]" />
                <h4 className="text-xs font-bold text-[#10213D]">Stock Alerts</h4>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                className="text-[11px] font-semibold text-[#1264D8] hover:underline flex items-center gap-0.5"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {stats.stockAlerts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-rose-50/60 border border-rose-100"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={a.image_url}
                      alt={a.name}
                      className="w-8 h-8 rounded-lg object-cover bg-white border border-slate-200"
                    />
                    <div>
                      <h6 className="text-[11px] font-bold text-slate-800 leading-tight">{a.name}</h6>
                      <span className="text-[10px] text-rose-600 font-bold block">
                        Only {a.quantity} in stock!
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    Low Stock
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
