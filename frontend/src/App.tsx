import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import BillCalculator from './components/BillCalculator';
import EscrowAnalyzer from './components/EscrowAnalyzer';
import BillTracker from './components/BillTracker';
import DocumentUpload from './components/DocumentUpload';
import ClientManager from './components/ClientManager';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calculator" element={<BillCalculator />} />
        <Route path="/escrow" element={<EscrowAnalyzer />} />
        <Route path="/bills" element={<BillTracker />} />
        <Route path="/upload" element={<DocumentUpload />} />
        <Route path="/clients" element={<ClientManager />} />
      </Route>
    </Routes>
  );
}
