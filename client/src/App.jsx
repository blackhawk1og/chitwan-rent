import { Routes, Route } from "react-router-dom";
import MapShell from "./components/MapShell.jsx";
import DeleteFlatPage from "./pages/DeleteFlatPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import TermsOfUsePage from "./pages/TermsOfUsePage.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/deleteflat" element={<DeleteFlatPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/termofuse" element={<TermsOfUsePage />} />
        {/* MapShell owns every other path itself via useLocation() (e.g.
            /list-my-flat, /find-a-flat, /how-to-use, /superheroes) — this
            catch-all preserves that, matching how it rendered unconditionally
            before /deleteflat was added as this app's first real route. */}
        <Route path="/*" element={<MapShell />} />
      </Routes>
    </>
  );
}
