import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { isOnboardingDismissed } from "../components/OnboardingModal.jsx";
import { reverseGeocodeArea } from "../lib/geocode.js";

// Drives the shared "onboarding -> pin-drop -> form" state machine used by
// both List My Flat and Find a Flat. Only one instance is ever active at a
// time since each is keyed to its own route path.
//
// Identity (email + phone) is no longer collected upfront here — browsing
// into either flow requires no sign-in at all. Each flow's own final form
// collects email + phone itself and logs the user in inline at submit time
// (see MapShell's handleSubmitListFlatDetails / handleSubmitSeekerForm).
//
// Normally pin-drop is an interactive map-tap step. The empty-map quick
// action chooser already knows the coordinates (the user tapped them to
// open the chooser), so it can call startWithPin() to skip straight past
// pin-drop to the form once onboarding is satisfied — the pending
// coordinate is stashed in a ref (not state) since it's transient input
// consumed at most once, not something the UI itself renders.
export function usePinDropFlow({ routePath, onboardingKey, areas }) {
  const location = useLocation();
  const [step, setStep] = useState(null); // 'onboarding' | 'pin-drop' | 'form' | null
  const [draftPin, setDraftPin] = useState(null); // { lat, lng, area }
  const pendingQuickPinRef = useRef(null); // { lat, lng } | null

  const resolveArea = async (lat, lng) => {
    const area = await reverseGeocodeArea(lat, lng, areas);
    setDraftPin((p) => (p && p.lat === lat && p.lng === lng ? { ...p, area } : p));
  };

  const jumpToForm = (lat, lng) => {
    pendingQuickPinRef.current = null;
    setDraftPin({ lat, lng, area: null });
    setStep("form");
    resolveArea(lat, lng);
  };

  useEffect(() => {
    if (location.pathname === routePath) {
      const quickPin = pendingQuickPinRef.current;
      if (!isOnboardingDismissed(onboardingKey)) {
        setStep("onboarding");
        setDraftPin(null);
      } else if (quickPin) {
        jumpToForm(quickPin.lat, quickPin.lng);
      } else {
        setStep("pin-drop");
        setDraftPin(null);
      }
    } else {
      setStep(null);
      setDraftPin(null);
      pendingQuickPinRef.current = null;
    }
  }, [location.pathname, routePath, onboardingKey]);

  const proceedAfterOnboarding = () => {
    const quickPin = pendingQuickPinRef.current;
    if (quickPin) {
      jumpToForm(quickPin.lat, quickPin.lng);
    } else {
      setStep("pin-drop");
    }
  };

  const placePin = (latlng) => {
    const { lat, lng } = latlng;
    setDraftPin({ lat, lng, area: null });
    setStep("form");
    resolveArea(lat, lng);
  };

  const dragPin = (latlng) => {
    const { lat, lng } = latlng;
    setDraftPin({ lat, lng, area: null });
    resolveArea(lat, lng);
  };

  const cancelForm = () => {
    setDraftPin(null);
    setStep("pin-drop");
  };

  const finish = () => {
    setStep(null);
    setDraftPin(null);
    pendingQuickPinRef.current = null;
  };

  // Called from the empty-map quick action chooser: stash the tapped
  // coordinate, then the caller navigates to routePath, which re-runs the
  // effect above and lands on auth/onboarding/form as appropriate.
  const startWithPin = (lat, lng) => {
    pendingQuickPinRef.current = { lat, lng };
  };

  return {
    step,
    setStep,
    draftPin,
    placePin,
    dragPin,
    cancelForm,
    finish,
    proceedAfterOnboarding,
    startWithPin,
  };
}
