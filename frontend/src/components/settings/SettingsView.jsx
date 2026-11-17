import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Database,
  Smartphone,
  Receipt,
  Shield,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building,
  DollarSign
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'pos', 'mpesa', 'backup'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  const [settings, setSettings] = useState({
    shop_name: 'MASHALITIC AUTO SPARES',
    tagline: 'Drive with Confidence.',
    phone: '+254 712 345 678',
    email: 'sales@mashalitic.co.ke',
    address: 'Kirinyaga Road, Motor Mart Plaza, Shop G-12, Nairobi, Kenya',
    currency: 'KSh',
    vat_rate: '16.00',
    vat_enabled: 'true',
    low_stock_threshold: '5',
    invoice_prefix: 'INV-',
    po_prefix: 'PO-',
    receipt_footer: 'Thank you for choosing Mashalitic Auto Spares! Genuine parts guaranteed.',
    mpesa_env: 'sandbox',
    mpesa_paybill: '174379',
    mpesa_passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    mpesa_consumer_key: '',
    mpesa_consumer_secret: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (e) {
      console.warn('Using default settings state');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/settings', settings);
      if (res.data.success) {
        toast.success('System settings saved successfully');
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await api.post('/settings/backup');
      if (res.data.success) {
        toast.success(`Backup snapshot created: ${res.data.filename}`);

        // Trigger client-side download of the database backup
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      toast.error('Backup creation failed');
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-[#10213D] tracking-tight">System Settings & Configuration</h2>
        <p className="text-xs text-slate-500 font-medium">Manage shop identity, receipt layouts, KRA VAT tax settings, M-Pesa Daraja, and database backups</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'general' ? 'bg-white text-[#10213D] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4 text-[#FF7900]" />
          <span>Shop Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pos' ? 'bg-white text-[#10213D] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-[#1264D8]" />
          <span>POS & VAT</span>
        </button>

        <button
          onClick={() => setActiveTab('mpesa')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'mpesa' ? 'bg-white text-[#10213D] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <span>M-Pesa Daraja</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'backup' ? 'bg-white text-[#10213D] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-purple-600" />
          <span>Data Backup</span>
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        {/* TAB 1: GENERAL */}
        {activeTab === 'general' && (
          <div className="space-y-4 text-xs">
            <h4 className="text-sm font-bold text-[#10213D] border-b border-slate-100 pb-2">Business Identity</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={settings.shop_name}
                  onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Physical Showroom Address</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POS & VAT */}
        {activeTab === 'pos' && (
          <div className="space-y-4 text-xs">
            <h4 className="text-sm font-bold text-[#10213D] border-b border-slate-100 pb-2">POS & Tax Parameters</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Currency Code</label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Standard VAT Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.vat_rate}
                  onChange={(e) => setSettings({ ...settings, vat_rate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Low Stock Warning Threshold</label>
                <input
                  type="number"
                  value={settings.low_stock_threshold}
                  onChange={(e) => setSettings({ ...settings, low_stock_threshold: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={settings.invoice_prefix}
                  onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Thermal Receipt Footer Message</label>
                <textarea
                  rows="2"
                  value={settings.receipt_footer}
                  onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MPESA */}
        {activeTab === 'mpesa' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-[#10213D]">Safaricom Daraja API Gateway</h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Lipa Na M-Pesa Online
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-[11px]">
              Supports STK Push payments. When Consumer Key is empty, the system automatically runs in high-fidelity sandbox testing simulation.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Environment Mode</label>
                <select
                  value={settings.mpesa_env}
                  onChange={(e) => setSettings({ ...settings, mpesa_env: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="sandbox">Sandbox (Testing / Demo)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Paybill / Till Shortcode</label>
                <input
                  type="text"
                  value={settings.mpesa_paybill}
                  onChange={(e) => setSettings({ ...settings, mpesa_paybill: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Online Passkey</label>
                <input
                  type="password"
                  value={settings.mpesa_passkey}
                  onChange={(e) => setSettings({ ...settings, mpesa_passkey: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Daraja Consumer Key</label>
                <input
                  type="text"
                  placeholder="Leave empty for sandbox simulation"
                  value={settings.mpesa_consumer_key}
                  onChange={(e) => setSettings({ ...settings, mpesa_consumer_key: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Daraja Consumer Secret</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={settings.mpesa_consumer_secret}
                  onChange={(e) => setSettings({ ...settings, mpesa_consumer_secret: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BACKUP */}
        {activeTab === 'backup' && (
          <div className="space-y-4 text-xs">
            <h4 className="text-sm font-bold text-[#10213D] border-b border-slate-100 pb-2">
              Database Backup & Disaster Recovery
            </h4>

            <p className="text-slate-600">
              Create an instantaneous snapshot of all products, customer records, supplier accounts, sales transactions, stock movement history, and audit logs.
            </p>

            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-purple-900">Download Full Database Snapshot</h5>
                <p className="text-[11px] text-purple-700">Exports all normalized relational tables into a downloadable JSON archive.</p>
              </div>

              <button
                type="button"
                onClick={handleTriggerBackup}
                disabled={backupLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-md shadow-purple-700/20 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{backupLoading ? 'Exporting...' : 'Create Backup'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        {activeTab !== 'backup' && (
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#FF7900] hover:bg-[#E66D00] text-white rounded-xl text-xs font-extrabold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
