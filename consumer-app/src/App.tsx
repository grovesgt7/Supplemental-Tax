import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import SupplementalEstimator from './pages/SupplementalEstimator';
import BillChecker from './pages/BillChecker';
import AnnualAnalyzer from './pages/AnnualAnalyzer';
import Faq from './pages/Faq';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/estimate" element={<SupplementalEstimator />} />
        <Route path="/check-bill" element={<BillChecker />} />
        <Route path="/annual" element={<AnnualAnalyzer />} />
        <Route path="/faq" element={<Faq />} />
      </Routes>
    </Layout>
  );
}
