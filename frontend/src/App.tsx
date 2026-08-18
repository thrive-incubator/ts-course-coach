import { Navigate, Route, Routes } from 'react-router-dom';
import Wizard from './pages/Wizard';
import MarketingBrief from './pages/MarketingBrief';
import Preview from './pages/Preview';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Wizard />} />
      <Route path="/brief" element={<MarketingBrief />} />
      <Route path="/preview" element={<Preview />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
