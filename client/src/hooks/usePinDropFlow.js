import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isOnboardingDismissed } from "../components/OnboardingModal.jsx";
import { reverseGeocodeArea } from "../lib/geocode.js";

// Drives the shared "onboarding -> pin-drop -> form" state machine used by
// both List My Flat and Find a Flat. Only one instance is ever active at a
// time since each is keyed to its own route path.
export function usePinDropFlow({ routePath, onboardingKey, areas }) {
  const location = useLocation();
  const [step, setStep] = useState(null); // 'onboarding' | 'pin-drop' | 'form' | null
  const [draftPin, setDraftPin] = useState(null); // { lat, lng, area }

  useEffect(() => {
    if (location.pathname === routePath) {
      setStep(isOnboardingDismissed(onboardingKey) ? "pin-drop" : "onboarding");
      setDraftPin(null);
    } else {
      setStep(null);
      setDraftPin(null);
    }
  }, [location.pathname, routePath, onboardingKey]);

  const resolveArea = async (lat, lng) => {
    const area = await reverseGeocodeArea(lat, lng, areas);
    setDraftPin((p) => (p && p.lat === lat && p.lng === lng ? { ...p, area } : p));
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
  };

  return { step, setStep, draftPin, placePin, dragPin, cancelForm, finish };
}
