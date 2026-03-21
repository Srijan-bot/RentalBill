import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import Settings from './pages/Settings';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<div className="text-center py-20 text-slate-500">Reports Page Coming Soon</div>} />
      </Routes>
    </Layout >
  );
}

export default App;
