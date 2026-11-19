import React from 'react';
import StoreNavbar from './StoreNavbar';
import StoreFooter from './StoreFooter';
import StoreCartDrawer from './StoreCartDrawer';

export default function StoreLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F3F6FC] flex flex-col justify-between selection:bg-[#FF7900] selection:text-white">
      <div>
        <StoreNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
          {children}
        </main>
      </div>

      <StoreCartDrawer />
      <StoreFooter />
    </div>
  );
}
