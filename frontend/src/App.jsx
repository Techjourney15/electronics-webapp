import { Routes, Route } from "react-router-dom";
import Auth from "./Auth";
import Preference from "./Preference";
import Home from "./Home";
import SellerOnboarding from "./SellerOnboarding";
import SellerDashboard from "./SellerDashboard";
import ProductDetail from "./ProductDetail";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/preferences" element={<Preference />} />
      <Route path="/homepage" element={<Home />} />
      <Route path="/seller-onboarding" element={<SellerOnboarding />} />
      <Route path="/seller-dashboard" element={<SellerDashboard />} />
      <Route path="/homepage" element={<Home />} />
      <Route path="/product/:id" element={<ProductDetail />} />
    </Routes>
  );
}

export default App;
