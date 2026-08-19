import { Routes, Route } from "react-router-dom";
import Auth from "./Auth";
import Preference from "./preference";
import Home from "./home";
import SellerOnboarding from "./SellerOnboarding";
import SellerDashboard from "./SellerDashboard";
import ProductDetail from "./ProductDetail";
import VisualSearch from "./VisualSearch";
import CustomerDashboard from "./CustomerDashboard";
import ProtectedRoute from "./ProtectedRoute";
import AdminDashboard from "./AdminDashboard";
import SearchResults from "./SearchResults";
import PaymentCallback from "./PaymentCallback";
import CheckoutPage from './CheckoutPage' 
import SellerStorefront from "./SellerStorefront";
function App() {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/preferences" element={<Preference />} />
      <Route path="/homepage" element={<Home />} />
      <Route path="/seller-onboarding" element={<SellerOnboarding />} />
      <Route path="/seller/:id" element={<SellerStorefront />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/visual-search" element={
        <ProtectedRoute allowedRole="customer"><VisualSearch /></ProtectedRoute>
      } />
      <Route path="/seller-dashboard" element={
        <ProtectedRoute allowedRole="seller"><SellerDashboard /></ProtectedRoute>
      } />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/customer-dashboard" element={
        <ProtectedRoute allowedRole="customer"><CustomerDashboard /></ProtectedRoute>
      } />
      <Route path="/admin-dashboard" element={
        <ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/payment-callback" element={<PaymentCallback />} />
    </Routes>
  );
}

export default App;