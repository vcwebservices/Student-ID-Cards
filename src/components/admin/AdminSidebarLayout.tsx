import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Settings, LogOut, ChevronRight } from 'lucide-react';
import { RTOS } from '../../lib/rtoConfig';

export function AdminSidebarLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 z-10">
        <div className="p-6 border-b border-gray-200 flex items-center justify-center">
          <img 
            src="https://storage.googleapis.com/stateless-my-aibt-global/2026/06/51d63225-screenshot_18-6-2026_82254_.jpeg" 
            alt="Colleges Logo"
            className="w-full mix-blend-multiply max-h-16 object-contain"
          />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            Overview
          </NavLink>

          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Colleges
            </p>
          </div>

          {RTOS.map((rto) => (
            <NavLink
              key={rto.id}
              to={`/admin/college/${rto.id}`}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-7 bg-white rounded flex items-center justify-center p-0.5 border border-gray-100 shadow-sm shrink-0 overflow-hidden">
                  {rto.logoUrl ? (
                    <img
                      src={rto.logoUrl}
                      alt={`${rto.shortName} Logo`}
                      className="w-full h-full object-contain mix-blend-multiply"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="w-full h-full rounded flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: rto.primaryColor }}
                    >
                      {rto.shortName.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="truncate">{rto.shortName}</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
