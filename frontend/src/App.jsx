import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';

import DashboardView from './components/dashboard/DashboardView';
import SalesView from './components/sales/SalesView';
import InventoryView from './components/inventory/InventoryView';
import CompatibilityView from './components/compatibility/CompatibilityView';
import PurchasesView from './components/purchases/PurchasesView';
import CustomersView from './components/customers/CustomersView';
import SuppliersView from './components/suppliers/SuppliersView';
import ExpensesView from './components/expenses/ExpensesView';
import ReportsView from './components/reports/ReportsView';
import SettingsView from './components/settings/SettingsView';
import LoginView from './components/auth/LoginView';

import CheckoutModal from './components/pos/CheckoutModal';
import BarcodeScannerModal from './components/pos/BarcodeScannerModal';
import ThermalReceiptModal from './components/pos/ThermalReceiptModal';

function AppLayout({ children, onOpenCheckout, onOpenBarcodeScanner }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F3F6FC] flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState(null);

  const handleSaleSuccess = (sale) => {
    setCompletedSaleData(sale);
  };

  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#071B38',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '12px'
              }
            }}
          />

          <Routes>
            <Route path="/login" element={<LoginView />} />

            <Route
              path="/"
              element={
                <AppLayout
                  onOpenCheckout={() => setShowCheckoutModal(true)}
                  onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
                >
                  <DashboardView
                    onOpenCheckout={() => setShowCheckoutModal(true)}
                    onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
                  />
                </AppLayout>
              }
            />

            <Route
              path="/sales"
              element={
                <AppLayout>
                  <SalesView />
                </AppLayout>
              }
            />

            <Route
              path="/inventory"
              element={
                <AppLayout>
                  <InventoryView />
                </AppLayout>
              }
            />

            <Route
              path="/compatibility"
              element={
                <AppLayout>
                  <CompatibilityView />
                </AppLayout>
              }
            />

            <Route
              path="/purchases"
              element={
                <AppLayout>
                  <PurchasesView />
                </AppLayout>
              }
            />

            <Route
              path="/customers"
              element={
                <AppLayout>
                  <CustomersView />
                </AppLayout>
              }
            />

            <Route
              path="/suppliers"
              element={
                <AppLayout>
                  <SuppliersView />
                </AppLayout>
              }
            />

            <Route
              path="/expenses"
              element={
                <AppLayout>
                  <ExpensesView />
                </AppLayout>
              }
            />

            <Route
              path="/reports"
              element={
                <AppLayout>
                  <ReportsView />
                </AppLayout>
              }
            />

            <Route
              path="/settings"
              element={
                <AppLayout>
                  <SettingsView />
                </AppLayout>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Global Modals */}
          <CheckoutModal
            isOpen={showCheckoutModal}
            onClose={() => setShowCheckoutModal(false)}
            onSaleSuccess={handleSaleSuccess}
          />

          <BarcodeScannerModal
            isOpen={showBarcodeScanner}
            onClose={() => setShowBarcodeScanner(false)}
          />

          <ThermalReceiptModal
            isOpen={Boolean(completedSaleData)}
            onClose={() => setCompletedSaleData(null)}
            saleData={completedSaleData}
          />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
