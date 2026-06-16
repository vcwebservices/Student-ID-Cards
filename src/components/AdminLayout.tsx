import React from 'react';
import { Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <main className="flex-1 w-full flex flex-col items-center p-0">
        <Outlet />
      </main>
    </div>
  );
}
