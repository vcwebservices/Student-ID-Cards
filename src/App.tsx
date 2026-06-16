import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GeneratePass } from './pages/GeneratePass';
import { PassView } from './pages/PassView';
import { AdminLayout } from './components/AdminLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pass/:studentId" element={<PassView />} />
        
        {/* Main Route */}
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<GeneratePass />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
