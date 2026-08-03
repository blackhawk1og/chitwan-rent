import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router's client-side navigation doesn't reset scroll position like a
// full page load would — without this, clicking a <Link> to a new route
// (e.g. Contact -> Privacy Policy) keeps whatever scroll offset the previous
// page had, landing partway down the new page instead of at the top.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
