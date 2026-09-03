import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import Marketing from './pages/Marketing';
import Pedagogy from './pages/Pedagogy';
import MarketingBrief from './pages/MarketingBrief';
import Preview from './pages/Preview';
import ArticulateGuide from './pages/ArticulateGuide';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/marketing" element={<Marketing />} />
      <Route path="/pedagogy" element={<Pedagogy />} />
      <Route path="/brief" element={<MarketingBrief />} />
      <Route path="/preview" element={<Preview />} />
      <Route path="/articulate-guide" element={<ArticulateGuide />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
