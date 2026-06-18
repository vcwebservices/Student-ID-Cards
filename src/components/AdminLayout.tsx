import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center relative">
      <Link 
        to="/admin" 
        className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
      >
        <LayoutDashboard className="w-4 h-4" />
        Admin Dashboard
      </Link>
      <main className="flex-1 w-full flex flex-col items-center p-0">
        <Outlet />
      </main>
    </div>
  );
}
