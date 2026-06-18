import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GeneratePass } from './pages/GeneratePass';
import { PassView } from './pages/PassView';
import { AdminLayout } from './components/AdminLayout'; // The legacy layout? Wait, we'll keep GeneratePass on AdminLayout if it was the default
import { AdminSidebarLayout } from './components/admin/AdminSidebarLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CollegeDetails } from './pages/admin/CollegeDetails';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pass/:studentId" element={<PassView />} />
        
        {/* Generative UI Form Route */}
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<GeneratePass />} />
        </Route>

        {/* Dashboard Routes */}
        <Route path="/admin" element={<AdminSidebarLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="college/:rtoId" element={<CollegeDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
