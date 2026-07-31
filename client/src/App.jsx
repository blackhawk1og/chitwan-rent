import { Routes, Route } from "react-router-dom";
import MapShell from "./components/MapShell.jsx";
import DeleteFlatPage from "./pages/DeleteFlatPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/deleteflat" element={<DeleteFlatPage />} />
      {/* MapShell owns every other path itself via useLocation() (e.g.
          /list-my-flat, /find-a-flat, /how-to-use, /superheroes) — this
          catch-all preserves that, matching how it rendered unconditionally
          before /deleteflat was added as this app's first real route. */}
      <Route path="/*" element={<MapShell />} />
    </Routes>
  );
}
