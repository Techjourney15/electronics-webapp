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
import CheckoutPage from "./CheckoutPage";
import SellerStorefront from "./SellerStorefront";
import Favorites from "./Favorites";

// Customer pages
import AccountPage from "./AccountPage";
import OrdersPage from "./OrdersPage";
import CartPage from "./CartPage";

// Account dropdown pages
import HelpPage from "./HelpPage";
import PoliciesPage from "./PoliciesPage";
import FeedbackPage from "./FeedbackPage";

function App() {
  return (
    <Routes>

      {/* ==================== PUBLIC ROUTES ==================== */}

      <Route path="/" element={<Auth />} />
      <Route path="/login" element={<Auth />} />

      <Route path="/preferences" element={<Preference />} />
      <Route path="/homepage" element={<Home />} />

      <Route path="/seller-onboarding" element={<SellerOnboarding />} />
      <Route path="/seller/:id" element={<SellerStorefront />} />

      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/search" element={<SearchResults />} />

      <Route path="/payment-callback" element={<PaymentCallback />} />

      <Route path="/checkout" element={<CheckoutPage />} />

      {/* ==================== CUSTOMER ROUTES ==================== */}

      <Route
        path="/visual-search"
        element={
          <ProtectedRoute allowedRole="customer">
            <VisualSearch />
          </ProtectedRoute>
        }
      />

      <Route
        path="/customer-dashboard"
        element={
          <ProtectedRoute allowedRole="customer">
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/account"
        element={
          <ProtectedRoute allowedRole="customer">
            <AccountPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <ProtectedRoute allowedRole="customer">
            <OrdersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cart"
        element={
          <ProtectedRoute allowedRole="customer">
            <CartPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/favorites"
        element={
          <ProtectedRoute allowedRole="customer">
            <Favorites />
          </ProtectedRoute>
        }
      />

      {/* ==================== ACCOUNT DROPDOWN PAGES ==================== */}

      <Route path="/help" element={<HelpPage />} />
      <Route path="/policies" element={<PoliciesPage />} />
      <Route path="/feedback" element={<FeedbackPage />} />

      {/* ==================== SELLER ROUTES ==================== */}

      <Route
        path="/seller-dashboard"
        element={
          <ProtectedRoute allowedRole="seller">
            <SellerDashboard />
          </ProtectedRoute>
        }
      />

      {/* ==================== ADMIN ROUTES ==================== */}

      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}

export default App;