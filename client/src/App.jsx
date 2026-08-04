import { Routes, Route } from "react-router-dom";
import MapShell from "./components/MapShell.jsx";
import FlatStatusPage from "./pages/FlatStatusPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import TermsOfUsePage from "./pages/TermsOfUsePage.jsx";
import InternalDashboardPage from "./pages/InternalDashboardPage.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Replaces the old /deleteflat + DeleteFlatPage.jsx — a single
            code-verified entry point for both "mark as rented" and "delete",
            not two live routes for overlapping owner actions. */}
        <Route path="/flatstatus" element={<FlatStatusPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/termofuse" element={<TermsOfUsePage />} />
        {/* Internal-only, password-gated (see InternalDashboardPage.jsx /
            server's routes/dashboard.js) — not linked from any nav or public
            page, same "route not in the catch-all" treatment as the other
            standalone pages above. */}
        <Route path="/internal/dashboard" element={<InternalDashboardPage />} />
        {/* MapShell owns every other path itself via useLocation() (e.g.
            /list-my-flat, /find-a-flat, /how-to-use, /superheroes) — this
            catch-all preserves that, matching how it rendered unconditionally
            before /deleteflat was added as this app's first real route. */}
        <Route path="/*" element={<MapShell />} />
      </Routes>
    </>
  );
}
