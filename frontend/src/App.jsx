import { Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import TopNav from './components/TopNav.jsx';
import Landing from './pages/Landing.jsx';
import Docs from './pages/Docs.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Pricing from './pages/Pricing.jsx';
import Recipient from './pages/Recipient.jsx';
import Contact from './pages/Contact.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  const { pathname } = useLocation();
  const isRecipient = pathname.startsWith('/f/');

  return (
    <HelmetProvider>
      {!isRecipient && <TopNav />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/f/:id" element={<Recipient />} />
      </Routes>
    </HelmetProvider>
  );
}
