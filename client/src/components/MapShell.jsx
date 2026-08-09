import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { KeyRound, Search, Ruler } from "lucide-react";
import {
  CHITWAN_CENTER,
  DEFAULT_ZOOM,
  DARK_TILE_URL,
  DARK_LABEL_TILE_URL,
  DARK_TILE_ATTRIBUTION,
  SATELLITE_TILE_URL,
  SATELLITE_ATTRIBUTION,
} from "../lib/mapConfig.js";
import { haversineMeters } from "../lib/geo.js";
import { useFlats } from "../hooks/useFlats.js";
import { useAreas } from "../hooks/useAreas.js";
import { usePlaces } from "../hooks/usePlaces.js";
import { useToletSpots } from "../hooks/useToletSpots.js";
import { useBusRoutes } from "../hooks/useBusRoutes.js";
import { usePois } from "../hooks/usePois.js";
import { useCreateFlat } from "../hooks/useCreateFlat.js";
import { useCreateSeekerPin } from "../hooks/useCreateSeekerPin.js";
import { useCreateToletSpot } from "../hooks/useCreateToletSpot.js";
import { useUploadToletPhoto } from "../hooks/useUploadToletPhoto.js";
import { useCreateRentReport } from "../hooks/useCreateRentReport.js";
import { usePinDropFlow } from "../hooks/usePinDropFlow.js";
import { formatRs, formatRsCompact, bhkLabel } from "../lib/format.js";
import { fetchJson } from "../lib/api.js";
import { DEFAULT_FILTERS, countActiveFilters } from "../lib/filters.js";
import {
  createDotIcon,
  createHandleIcon,
  createUserLocationIcon,
  createYourPinIcon,
  createSearchResultPinIcon,
} from "../lib/mapIcons.jsx";
import TopNavPill from "./TopNavPill.jsx";
import SearchBar from "./SearchBar.jsx";
import IconStack from "./IconStack.jsx";
import OnboardingModal, { isOnboardingDismissed } from "./OnboardingModal.jsx";
import HowToUseTour, { isHowToUseTourSeen } from "./HowToUseTour.jsx";
import LandingCard from "./LandingCard.jsx";
import InitialLoadScreen from "./InitialLoadScreen.jsx";
import FilterModal from "./FilterModal.jsx";
import FlatsLayer from "./FlatsLayer.jsx";
import ToletSpotsLayer from "./ToletSpotsLayer.jsx";
import ToletSpotDetailCard from "./ToletSpotDetailCard.jsx";
import BusRoutesLayer from "./BusRoutesLayer.jsx";
import PoisLayer from "./PoisLayer.jsx";
import GeneralPoisLayer, { GENERAL_POI_CATEGORIES } from "./GeneralPoisLayer.jsx";
import PlaceLabelsLayer from "./PlaceLabelsLayer.jsx";
import ListingChip from "./ListingChip.jsx";
import FlatDetailPanel from "./FlatDetailPanel.jsx";
import NearbyFlatsModal from "./NearbyFlatsModal.jsx";
import SeekerDetailCard from "./SeekerDetailCard.jsx";
import MapZoomGuard from "./MapZoomGuard.jsx";
import PinDropBanner from "./PinDropBanner.jsx";
import StatusBanner from "./StatusBanner.jsx";
import PinDropCatcher from "./PinDropCatcher.jsx";
import EmptyTapCatcher from "./EmptyTapCatcher.jsx";
import QuickActionModal from "./QuickActionModal.jsx";
import RentReportForm from "./RentReportForm.jsx";
import OutOfBoundsModal from "./OutOfBoundsModal.jsx";
import AddFlatForm from "./AddFlatForm.jsx";
import ListFlatBranchModal from "./ListFlatBranchModal.jsx";
import ListFlatDetailsForm from "./ListFlatDetailsForm.jsx";
import ListFlatSuccessModal from "./ListFlatSuccessModal.jsx";
import DropSeekerPinForm from "./DropSeekerPinForm.jsx";
import ArchiveCheckPinsModal from "./ArchiveCheckPinsModal.jsx";
import SpotToLetModal from "./SpotToLetModal.jsx";
import SuperheroesModal from "./SuperheroesModal.jsx";
import MoreModal from "./MoreModal.jsx";
import AreaRectangleLayer from "./AreaRectangleLayer.jsx";
import AreaStatsResultsModal from "./AreaStatsResultsModal.jsx";
import AuthGateModal from "./AuthGateModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const LIST_MY_FLAT_STEPS = [
  "Drop a pin at your flat's location",
  "Fill in rent details",
  "Tell us if you're listing the whole place or finding a flatmate",
  "We'll email you when seekers match",
];

const FIND_A_FLAT_STEPS = [
  "Drop a pin where you want to live",
  "Tell us your budget and what you're looking for — a whole flat or a room",
  "We'll match you with available flats AND people looking for flatmates nearby. Whatever fits, you'll get an email.",
];

const AREA_STATS_STEPS = [
  "Tap to set your first corner",
  "Tap again to set the opposite corner",
  "Adjust the box, then tap View Stats →",
];

// Single source of truth for the top-bar cluster's box width — both the
// search+filter row and the status banner (which occupies the same slot
// across Avlb Flats / List My Flat / Find a Flat) reference this one class
// instead of each hardcoding their own max-width.
const TOP_BAR_ROW_MAX_WIDTH_CLASS = "max-w-3xl";

// Pin drops more than this far from Chitwan center get blocked with
// OutOfBoundsModal instead of proceeding into a form.
const MAX_PIN_DISTANCE_METERS = 100_000;

const draftFlatIcon = createDotIcon(KeyRound, { bg: "#7c3aed", size: 32 });
const draftSeekerIcon = createDotIcon(Search, { bg: "#14b8a6", size: 32 });
const areaCornerIcon = createHandleIcon();
const userLocationIcon = createUserLocationIcon();

export default function MapShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const { isAuthenticated, login } = useAuth();

  // Generic auth gate for actions that aren't tied to a route (Spot a To-Let).
  // Route-based flows (List My Flat / Find a Flat) gate via usePinDropFlow instead.
  const [pendingAuthAction, setPendingAuthAction] = useState(null);
  const withAuth = (action) => {
    if (isAuthenticated) action();
    else setPendingAuthAction(() => action);
  };

  // Front door on every page load (see LandingCard.jsx) — shown on top of
  // everything else including HowToUseTour, every time MapShell mounts (i.e.
  // every refresh), not gated by a "seen" flag. Its own effect below
  // (unchanged) may have already navigated to "/how-to-use" by the time this
  // dismisses; the "Browse"/"Pin your rent"/"Let's start" paths correct back
  // to "/" so the tour doesn't surface right behind it, while the List My
  // Flat/Find a Flat tiles' own <Link> navigations (which fire immediately
  // after, same click) still win as intended.
  const [showLanding, setShowLanding] = useState(true);
  const handleDismissLanding = () => {
    setShowLanding(false);
    if (location.pathname === "/how-to-use") navigate("/");
  };

  // First-time visitors land straight on the guided tour (see
  // HowToUseTour.jsx) — routes there exactly like clicking the "How to use"
  // pill would, so both paths render the exact same tour. Only fires once,
  // on mount, and only from the default map view (a direct/bookmarked link
  // into a specific flow, e.g. "/list-my-flat", is left alone).
  useEffect(() => {
    if (location.pathname === "/" && !isHowToUseTourSeen()) {
      navigate("/how-to-use");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [searchValue, setSearchValue] = useState("");
  // The pin dropped at a picked search result — {label, lat, lng} or null.
  // Setting it always replaces whatever was there before (no stacking, see
  // handleSelectLocation); this effect is the other half of that lifecycle,
  // clearing it once the input is emptied out rather than left stale from a
  // prior search.
  const [searchResult, setSearchResult] = useState(null);
  useEffect(() => {
    if (!searchValue.trim()) setSearchResult(null);
  }, [searchValue]);
  const searchResultIcon = useMemo(
    () => (searchResult ? createSearchResultPinIcon(searchResult.label) : null),
    [searchResult]
  );

  const [quickModal, setQuickModal] = useState(null); // 'spot-a-tolet' | 'more' | 'filters' | null

  const [satelliteOn, setSatelliteOn] = useState(false);
  const [busRoutesOn, setBusRoutesOn] = useState(false);
  const [schoolsOn, setSchoolsOn] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const filterCount = countActiveFilters(filters);

  const { data: flats = [], isLoading: flatsLoading } = useFlats(filters);

  // InitialLoadScreen only ever covers the very first flats fetch of the
  // session — the one that can be sitting behind a cold Render free-tier
  // instance (30-60s) — never the quick refetches that follow every filter
  // change (those keep the small "Loading flats…" pill below, unchanged).
  // initialLoadDoneRef flips exactly once, the first time flatsLoading goes
  // false; showInitialLoad stays true a beat longer than that so
  // InitialLoadScreen gets to play its own fade-out (fadingOut prop) instead
  // of popping out the instant data arrives.
  const [showInitialLoad, setShowInitialLoad] = useState(true);
  const initialLoadDoneRef = useRef(false);
  useEffect(() => {
    if (!flatsLoading && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      const timer = setTimeout(() => setShowInitialLoad(false), 600);
      return () => clearTimeout(timer);
    }
  }, [flatsLoading]);
  const { data: areas = [] } = useAreas();
  const { data: places = [] } = usePlaces();
  const { data: toletSpots = [] } = useToletSpots();
  const { data: busRoutes = [] } = useBusRoutes(busRoutesOn);
  const { data: schoolPois = [] } = usePois("school,college", schoolsOn);
  // No manual toggle — a persistent, zoom-gated layer (matches Google Maps'
  // default POI behavior, the reference this app is styled after), so it's
  // always fetched once and reveals itself progressively as the user zooms
  // in (see GeneralPoisLayer's tier thresholds).
  const { data: generalPois = [] } = usePois(GENERAL_POI_CATEGORIES);

  const [selectedItem, setSelectedItem] = useState(null); // { type: 'flat'|'seeker', data } | null
  // 'tolet' skips selectedItem entirely — a to-let pin click goes straight to
  // its detail card (see ToletSpotsLayer's onSelect below), no intermediate
  // ListingChip preview step like flats/seekers get, since there's only a
  // photo and two actions to show, not enough to warrant a two-step reveal.
  const [expandedItem, setExpandedItem] = useState(null); // { type: 'flat'|'seeker'|'tolet', data } | null — drives the full detail card
  const [nearbyFlatsPopup, setNearbyFlatsPopup] = useState(null); // flat[] | null — see NearbyFlatsModal

  const [justSubmittedFlats, setJustSubmittedFlats] = useState([]);
  const [justSubmittedToletSpots, setJustSubmittedToletSpots] = useState([]);
  const createFlat = useCreateFlat();
  const createSeekerPin = useCreateSeekerPin();
  const createToletSpot = useCreateToletSpot();
  const uploadToletPhoto = useUploadToletPhoto();
  const createRentReport = useCreateRentReport();
  // Covers the full submit span (inline login + create), not just
  // createSeekerPin's own mutation state — see handleSubmitSeekerForm.
  const [findFlatSubmitting, setFindFlatSubmitting] = useState(false);
  const [findFlatSubmitError, setFindFlatSubmitError] = useState(false);
  // Non-null while the archive-check modal is showing — { existingPins,
  // form }, set once GET /seeker-pins/by-email comes back non-empty. The
  // underlying DropSeekerPinForm stays mounted (and its input state intact)
  // the whole time, since this only adds an overlay on top rather than
  // changing findFlatFlow.step — see handleSubmitSeekerForm.
  const [archiveCheckState, setArchiveCheckState] = useState(null);

  // Empty-map-tap quick action chooser: { step: 'chooser' | 'rent-report', lat, lng } | null
  const [quickAction, setQuickAction] = useState(null);

  // Out-of-bounds pin guard (List My Flat / Find a Flat / Spot a To-Let, both
  // via direct pin-drop and via the quick action chooser). Holds the "cancel"
  // callback appropriate to whichever flow triggered it — clicking "Got it"
  // runs it, returning to normal map state exactly like a pin-drop Cancel.
  const [outOfBoundsCancel, setOutOfBoundsCancel] = useState(null);

  const isWithinChitwan = (lat, lng) =>
    haversineMeters(lat, lng, CHITWAN_CENTER[0], CHITWAN_CENTER[1]) <= MAX_PIN_DISTANCE_METERS;

  // Runs a pin-drop callback if the coordinate is within range, otherwise
  // shows OutOfBoundsModal and stashes cancelAction for its "Got it" button.
  const guardPinDrop = (latlng, cancelAction, onValid) => {
    if (isWithinChitwan(latlng.lat, latlng.lng)) {
      onValid(latlng);
    } else {
      setOutOfBoundsCancel(() => cancelAction);
    }
  };

  const dismissOutOfBounds = () => {
    outOfBoundsCancel?.();
    setOutOfBoundsCancel(null);
  };

  const listFlatFlow = usePinDropFlow({
    routePath: "/list-my-flat",
    onboardingKey: "list-my-flat",
    areas,
  });
  const findFlatFlow = usePinDropFlow({
    routePath: "/find-a-flat",
    onboardingKey: "find-a-flat",
    areas,
  });

  // List My Flat continues past usePinDropFlow's own "form" step into three
  // more steps (branch choice -> final details -> success/share) — kept as
  // local state here rather than folded into usePinDropFlow, since that hook
  // is shared with Find a Flat and must stay unaffected. listFlatFlow.step
  // stays "form" throughout (draftPin must survive to the end), so
  // AddFlatForm's own render is additionally gated on !listFlatPostStep.
  const [listFlatPostStep, setListFlatPostStep] = useState(null); // null | 'branch' | 'details' | 'success'
  const [listFlatBranch, setListFlatBranch] = useState(null); // 'flat' | 'flatmate'
  const [listFlatStep0Data, setListFlatStep0Data] = useState(null); // AddFlatForm's submitted fields
  const [listFlatCreatedFlat, setListFlatCreatedFlat] = useState(null); // API response, used by the success step
  // Covers the full submit span (inline login + create), not just createFlat's
  // own mutation state — see handleSubmitListFlatDetails.
  const [listFlatSubmitting, setListFlatSubmitting] = useState(false);
  const [listFlatSubmitError, setListFlatSubmitError] = useState(null);

  // "Your Pin" marker replacing the plain draggable dot once Step 0 is
  // submitted — recomputed only when the underlying bhk/rent change.
  const yourPinIcon = useMemo(() => {
    if (!listFlatStep0Data) return null;
    return createYourPinIcon({
      bhkText: bhkLabel(listFlatStep0Data.bhk),
      rentText: formatRsCompact(listFlatStep0Data.rent),
    });
  }, [listFlatStep0Data]);

  // Spot a To-Let: its own lightweight flow — no onboarding step, and the
  // form's fields must survive the "pick on map" detour, so they're lifted
  // up here rather than living inside the (temporarily unmounted) modal.
  // toletPhoto is the base64 preview (unchanged, local-only, never sent to
  // the server); toletPhotoFile is the raw File — that's what actually gets
  // uploaded to Cloudinary on submit (see handleSubmitToletSpot below).
  const [toletPhoto, setToletPhoto] = useState(null);
  const [toletPhotoFile, setToletPhotoFile] = useState(null);
  const [toletName, setToletName] = useState("");
  const [toletMessage, setToletMessage] = useState("");
  const [toletLocation, setToletLocation] = useState(null);
  const [toletPicking, setToletPicking] = useState(false);

  const [pinsHidden, setPinsHidden] = useState(false);

  // "You are here" marker dropped by Locate Me — a single snapshot position,
  // persists on the map (moving to the new spot each time Locate Me is used
  // again) rather than continuously live-tracking.
  const [userLocation, setUserLocation] = useState(null);
  const [locateError, setLocateError] = useState(null);
  const locateErrorTimeoutRef = useRef(null);

  // Area Stats: 'onboarding' -> 'drawing' (2 taps) -> 'adjusting' (drag corners) -> 'results'
  const [areaStatsStep, setAreaStatsStep] = useState(null);
  const [areaDrawCorner1, setAreaDrawCorner1] = useState(null);
  const [areaBounds, setAreaBounds] = useState(null); // { north, south, east, west }
  const [areaStatsType, setAreaStatsType] = useState("all");

  const areaStatsDrawing = areaStatsStep === "drawing" || areaStatsStep === "adjusting";
  // Only Spot-a-To-Let and Area Stats still use the full-width top PinDropBanner
  // strip — List My Flat / Find a Flat pin-drop now render inline via topBarStatus.
  const pushDown = toletPicking || areaStatsDrawing;
  // Whenever a flow already has its own PinDropCatcher mounted and awaiting a
  // tap-to-place-pin, that takes priority — the empty-tap quick action
  // chooser must not compete with it for the same map click.
  const mapClickCaptured =
    listFlatFlow.step === "pin-drop" || findFlatFlow.step === "pin-drop" || toletPicking || areaStatsDrawing;

  const displayedFlats = useMemo(() => {
    if (!justSubmittedFlats.length) return flats;
    const existingIds = new Set(flats.map((f) => f.id));
    return [...flats, ...justSubmittedFlats.filter((f) => !existingIds.has(f.id))];
  }, [flats, justSubmittedFlats]);

  const displayedToletSpots = useMemo(() => {
    const existingIds = new Set(toletSpots.map((s) => s.id));
    return [...toletSpots, ...justSubmittedToletSpots.filter((s) => !existingIds.has(s.id))];
  }, [toletSpots, justSubmittedToletSpots]);

  const closeRouteModal = () => navigate("/");
  const closeQuickModal = () => setQuickModal(null);

  const handleSelectLocation = (suggestion) => {
    mapRef.current?.flyTo([suggestion.lat, suggestion.lng], 15, { duration: 1.2 });
    setSearchResult(suggestion);
  };

  // Empty-map-tap quick action chooser and its four destinations. The
  // distance check runs at tap time, before the chooser ever opens — an
  // out-of-bounds tap shows OutOfBoundsModal directly and never shows the
  // chooser at all. Because of that, by the time quickAction is set (and the
  // handlers below run), the location is already confirmed valid.
  const handleEmptyMapTap = (latlng) => {
    guardPinDrop(
      latlng,
      () => {},
      (pos) => setQuickAction({ step: "chooser", lat: pos.lat, lng: pos.lng })
    );
  };

  const handleQuickActionListFlat = () => {
    if (!quickAction) return;
    listFlatFlow.startWithPin(quickAction.lat, quickAction.lng);
    setQuickAction(null);
    navigate("/list-my-flat");
  };

  const handleQuickActionFindFlat = () => {
    if (!quickAction) return;
    findFlatFlow.startWithPin(quickAction.lat, quickAction.lng);
    setQuickAction(null);
    navigate("/find-a-flat");
  };

  const handleQuickActionSpotToLet = () => {
    if (!quickAction) return;
    const { lat, lng } = quickAction;
    setQuickAction(null);
    withAuth(() => {
      setToletLocation({ lat, lng });
      setQuickModal("spot-a-tolet");
    });
  };

  const handleSubmitRentReport = async (form) => {
    if (!quickAction) return;
    try {
      await createRentReport.mutateAsync({
        rent: Number(form.rent),
        bhk: form.bhk,
        gated: form.gated,
        furnishing: form.furnishing ?? null,
        parking_for: form.parkingFor !== "" ? Number(form.parkingFor) : null,
        lat: quickAction.lat,
        lng: quickAction.lng,
      });
      setQuickAction(null);
    } catch {
      // error surfaced via createRentReport.isError in the form
    }
  };

  // Briefly pulses the filter button when Avlb Flats auto-applies its filter,
  // drawing the eye to the badge count that just changed. Finite (CSS
  // iteration-count: 3), not a permanent loop — cleared via timeout.
  const [filterPulse, setFilterPulse] = useState(false);
  const filterPulseTimeoutRef = useRef(null);

  const handleAvlbFlatsClick = () => {
    if (location.pathname !== "/") navigate("/");
    setFilters((f) => ({ ...f, availableOnly: true }));

    if (filterPulseTimeoutRef.current) clearTimeout(filterPulseTimeoutRef.current);
    setFilterPulse(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setFilterPulse(true)));
    filterPulseTimeoutRef.current = setTimeout(() => setFilterPulse(false), 2000);
  };

  const handleCancelAvlbFlats = () => {
    setFilters((f) => ({ ...f, availableOnly: false }));
  };

  // Drives the shared collapsed top-bar layout: when set, the nav pill row is
  // replaced by a status banner and the search+filter row moves underneath it.
  // Same slot for all three flows — only the content differs.
  const topBarStatus = filters.availableOnly
    ? {
        accent: "teal",
        title: "🏠 Now showing all available flats",
        subtitle: "Tap Cancel or clear from Filters ↗",
        onCancel: handleCancelAvlbFlats,
      }
    : listFlatFlow.step === "pin-drop"
    ? {
        accent: "purple",
        title: "👆 Tap your flat's location on the map to place your pin",
        onCancel: closeRouteModal,
      }
    : findFlatFlow.step === "pin-drop"
    ? {
        accent: "teal",
        title: "👆 Tap anywhere on the map to place your pin",
        onCancel: closeRouteModal,
      }
    : null;

  // The nav pill row sizes to its own content rather than filling its
  // wrapper — every other row (default search bar, status banner, and the
  // search bar shown once a banner is active) should match that same width
  // instead of each stretching to fill max-w-3xl independently. A hidden
  // clone of TopNavPill is kept mounted at all times (even while a banner
  // hides the real one) purely so its width can always be measured, at any
  // viewport size, regardless of which row is currently visible.
  const navMeasureRef = useRef(null);
  const [navRowWidth, setNavRowWidth] = useState(null);

  useLayoutEffect(() => {
    const navEl = navMeasureRef.current?.querySelector("nav");
    if (!navEl) return;

    const measure = () => setNavRowWidth(navEl.getBoundingClientRect().width);
    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(navEl);
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // AddFlatForm's submit no longer creates the flat directly — it stashes
  // its fields and hands off to the branch-choice step; the actual POST
  // happens once Step 2 (final details) is submitted, below.
  const handleSubmitFlatForm = (form) => {
    if (!listFlatFlow.draftPin) return;
    setListFlatStep0Data(form);
    setListFlatPostStep("branch");
  };

  const handleSelectListFlatBranch = (branch) => {
    setListFlatBranch(branch);
    setListFlatPostStep("details");
  };

  // Step 2's "Cancel" goes back to the branch choice (data already entered
  // in Step 0/1 is preserved) — distinct from the modal's own "×", which
  // exits the whole flow (see handleCancelListFlatPostSteps).
  const handleBackToListFlatBranch = () => {
    setListFlatPostStep("branch");
  };

  // Exits the post-form steps entirely without submitting, back to the map
  // — used by the "×" on the branch/details steps.
  const handleCancelListFlatPostSteps = () => {
    setListFlatPostStep(null);
    setListFlatBranch(null);
    setListFlatStep0Data(null);
    listFlatFlow.finish();
    navigate("/");
  };

  // Identity is collected right here, as part of this form, rather than via
  // an upfront auth gate — login() is called inline with the submitted
  // email/phone (find-or-create, same dummy auth as everywhere else) so the
  // token is ready before createFlat's requireAuth'd POST fires. Both steps
  // are covered by listFlatSubmitting/listFlatSubmitError since createFlat's
  // own isPending/isError only spans the second half.
  const handleSubmitListFlatDetails = async (detailsForm) => {
    if (!listFlatFlow.draftPin || !listFlatStep0Data || !listFlatBranch) return;
    const step0 = listFlatStep0Data;
    const isFlatmate = listFlatBranch === "flatmate";
    setListFlatSubmitting(true);
    setListFlatSubmitError(null);
    try {
      await login({ email: detailsForm.email, phone: detailsForm.phone });
      const created = await createFlat.mutateAsync({
        listing_type: listFlatBranch,
        bhk: step0.bhk,
        rent: Number(step0.rent),
        deposit: step0.deposit === "" ? null : Number(step0.deposit),
        furnishing: step0.furnishing,
        includes_maintenance: step0.includesMaintenance,
        gated: step0.gated,
        who_lives: step0.whoLives,
        pets_allowed: step0.petsAllowed,
        // Parking is only asked once, in Step 0 — Step 2 no longer re-asks it.
        parking_for: Number(step0.parkingFor),
        // Set only when the owner explicitly confirmed an over-cap rent via
        // AddFlatForm's RentCapConfirmModal — see AddFlatForm.jsx.
        rent_flagged: step0.rentFlagged === true,
        sqft: step0.sqft === "" ? null : Number(step0.sqft),
        society_name: step0.societyName || null,
        one_liner: step0.oneLiner || null,
        description: step0.description || null,
        email: detailsForm.email || null,
        phone: detailsForm.phone || null,
        available_from: detailsForm.availableFrom,
        flatmate_gender_pref: isFlatmate ? detailsForm.flatmateGenderPref : null,
        food_pref: isFlatmate ? detailsForm.foodPref : null,
        smoker_ok: isFlatmate ? detailsForm.smokerOk : null,
        lat: listFlatFlow.draftPin.lat,
        lng: listFlatFlow.draftPin.lng,
        area: listFlatFlow.draftPin.area,
        photos: [],
      });
      setJustSubmittedFlats((prev) => [...prev, created]);
      mapRef.current?.flyTo([created.lat, created.lng], 16, { duration: 1 });
      setListFlatCreatedFlat(created);
      setListFlatPostStep("success");
    } catch (err) {
      // The rate-limit's 429 carries a specific, actionable message ("try
      // again in ~X hours") worth showing verbatim — everything else
      // (validation, network, 500s) collapses to one generic message rather
      // than surfacing a raw/technical error string.
      setListFlatSubmitError(err.status === 429 ? err.message : "Something went wrong — please try again.");
    } finally {
      setListFlatSubmitting(false);
    }
  };

  // The flat is already created by the time the success step shows — this
  // just tidies up local state and returns to the map (Skip/"×"/done).
  const handleCloseListFlatSuccess = () => {
    setListFlatPostStep(null);
    setListFlatBranch(null);
    setListFlatStep0Data(null);
    setListFlatCreatedFlat(null);
    listFlatFlow.finish();
    navigate("/");
  };

  // Same inline-login pattern as handleSubmitListFlatDetails above.
  // Shared by both the direct (no existing pins) and post-archive-check
  // paths below — archivePinIds is [] unless the user picked "Archive
  // selected + add new pin" in ArchiveCheckPinsModal.
  const finalizeCreateSeekerPin = async (form, archivePinIds) => {
    const created = await createSeekerPin.mutateAsync({
      looking_for: form.lookingFor,
      budget: Number(form.budget),
      bhk_pref: form.bhkPref,
      move_in: form.moveIn,
      food_pref: form.foodPref,
      smoker_ok: form.smokerOk,
      gender: form.gender,
      flatmate_gender_pref: form.flatmateGenderPref,
      parking_required: form.parkingRequired,
      lifestyle_note: form.lifestyleNote || null,
      email: form.email,
      phone: form.phone,
      lat: findFlatFlow.draftPin.lat,
      lng: findFlatFlow.draftPin.lng,
      area: findFlatFlow.draftPin.area,
      archive_pin_ids: archivePinIds.length > 0 ? archivePinIds : undefined,
    });
    mapRef.current?.flyTo([created.lat, created.lng], 16, { duration: 1 });
    findFlatFlow.finish();
    navigate("/");
  };

  // Before creating a new pin, checks whether this email already has any
  // seeker_pins (active or archived) — see GET /api/seeker-pins/by-email.
  // None found: create immediately, exactly as before (a truly first-time
  // email never sees the archive-check modal). Any found: hold off and show
  // ArchiveCheckPinsModal instead — its own three actions call
  // finalizeCreateSeekerPin themselves once the user decides.
  const handleSubmitSeekerForm = async (form) => {
    if (!findFlatFlow.draftPin) return;
    setFindFlatSubmitting(true);
    setFindFlatSubmitError(false);
    try {
      await login({ email: form.email, phone: form.phone });
      const existingPins = await fetchJson(`/seeker-pins/by-email?email=${encodeURIComponent(form.email)}`);
      if (existingPins.length > 0) {
        setArchiveCheckState({ existingPins, form });
        return;
      }
      await finalizeCreateSeekerPin(form, []);
    } catch {
      setFindFlatSubmitError(true);
    } finally {
      setFindFlatSubmitting(false);
    }
  };

  const handleArchiveCheckArchiveSelected = async (checkedIds) => {
    setFindFlatSubmitting(true);
    try {
      await finalizeCreateSeekerPin(archiveCheckState.form, checkedIds);
      setArchiveCheckState(null);
    } catch {
      setFindFlatSubmitError(true);
      setArchiveCheckState(null);
    } finally {
      setFindFlatSubmitting(false);
    }
  };

  const handleArchiveCheckKeepAll = async () => {
    setFindFlatSubmitting(true);
    try {
      await finalizeCreateSeekerPin(archiveCheckState.form, []);
      setArchiveCheckState(null);
    } catch {
      setFindFlatSubmitError(true);
      setArchiveCheckState(null);
    } finally {
      setFindFlatSubmitting(false);
    }
  };

  // Preserves the user's filled-out form: closing the modal doesn't touch
  // findFlatFlow.step or the draft pin, so DropSeekerPinForm stays mounted
  // underneath with whatever they'd already typed. Ignored while a request
  // is in flight (findFlatSubmitting) — same guard as the action buttons'
  // own `disabled`, since Modal's backdrop-click/X both route through this
  // same handler and shouldn't be able to dismiss mid-request either.
  const handleArchiveCheckCancel = () => {
    if (findFlatSubmitting) return;
    setArchiveCheckState(null);
  };

  const resetToletFlow = () => {
    setToletPhoto(null);
    setToletPhotoFile(null);
    setToletName("");
    setToletMessage("");
    setToletLocation(null);
    setToletPicking(false);
  };

  const handleCancelToletFlow = () => {
    resetToletFlow();
    closeQuickModal();
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setToletLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  };

  const handlePickToletOnMap = () => {
    setToletPicking(true);
  };

  const handlePlaceToletPin = (latlng) => {
    setToletLocation({ lat: latlng.lat, lng: latlng.lng });
    setToletPicking(false);
  };

  // Two sequential requests, not one — upload first (Cloudinary), then
  // create the row with the URL that comes back. uploadToletPhoto.isError
  // and createToletSpot.isError are surfaced as two distinct messages in
  // SpotToLetModal (uploadError vs submitError) rather than one generic
  // failure, so "the photo never made it up" reads differently from "the
  // photo uploaded fine but the pin itself failed to save."
  const handleSubmitToletSpot = async () => {
    if (!toletPhotoFile || !toletLocation) return;
    try {
      const { url } = await uploadToletPhoto.mutateAsync(toletPhotoFile);
      const created = await createToletSpot.mutateAsync({
        photo_url: url,
        name: toletName || null,
        message: toletMessage || null,
        lat: toletLocation.lat,
        lng: toletLocation.lng,
      });
      setJustSubmittedToletSpots((prev) => [...prev, created]);
      mapRef.current?.flyTo([created.lat, created.lng], 16, { duration: 1 });
      resetToletFlow();
      setQuickModal("superheroes");
    } catch {
      // error surfaced via uploadToletPhoto.isError / createToletSpot.isError in the form
    }
  };

  const showLocateError = (message) => {
    if (locateErrorTimeoutRef.current) clearTimeout(locateErrorTimeoutRef.current);
    setLocateError(message);
    locateErrorTimeoutRef.current = setTimeout(() => setLocateError(null), 4000);
  };

  const handleLocateMe = () => {
    closeQuickModal();
    if (!navigator.geolocation) {
      showLocateError("Location isn't supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        mapRef.current?.flyTo([latitude, longitude], 15, { duration: 1.2 });
      },
      () => {
        showLocateError("Couldn't get your location — check your browser's location permission.");
      }
    );
  };

  const handleToggleHidePins = () => {
    setPinsHidden((v) => !v);
    closeQuickModal();
  };

  const resetAreaStatsFlow = () => {
    setAreaStatsStep(null);
    setAreaDrawCorner1(null);
    setAreaBounds(null);
    setAreaStatsType("all");
  };

  const handleOpenAreaStats = () => {
    closeQuickModal();
    setAreaDrawCorner1(null);
    setAreaBounds(null);
    setAreaStatsType("all");
    setAreaStatsStep(isOnboardingDismissed("area-stats") ? "drawing" : "onboarding");
  };

  const handleAreaMapClick = (latlng) => {
    if (!areaDrawCorner1) {
      setAreaDrawCorner1(latlng);
      return;
    }
    const north = Math.max(areaDrawCorner1.lat, latlng.lat);
    const south = Math.min(areaDrawCorner1.lat, latlng.lat);
    const east = Math.max(areaDrawCorner1.lng, latlng.lng);
    const west = Math.min(areaDrawCorner1.lng, latlng.lng);
    setAreaBounds({ north, south, east, west });
    setAreaDrawCorner1(null);
    setAreaStatsStep("adjusting");
  };

  const handleAreaCornerDrag = (cornerKey, newLatLng) => {
    setAreaBounds((prev) => {
      const anchors = {
        nw: { lat: prev.south, lng: prev.east },
        ne: { lat: prev.south, lng: prev.west },
        sw: { lat: prev.north, lng: prev.east },
        se: { lat: prev.north, lng: prev.west },
      };
      const anchor = anchors[cornerKey];
      return {
        north: Math.max(anchor.lat, newLatLng.lat),
        south: Math.min(anchor.lat, newLatLng.lat),
        east: Math.max(anchor.lng, newLatLng.lng),
        west: Math.min(anchor.lng, newLatLng.lng),
      };
    });
  };

  const areaStatsBannerText =
    areaStatsStep === "drawing"
      ? areaDrawCorner1
        ? "📐 Tap again to set the opposite corner"
        : "📐 Tap to set your first corner"
      : areaStatsStep === "adjusting"
      ? "📐 Adjust corners or view stats"
      : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg">
      <MapContainer
        ref={mapRef}
        center={CHITWAN_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="absolute inset-0 z-0"
        // Leaflet's default zoomAnimationThreshold is 4 — any zoom-in larger
        // than that (e.g. clicking a cluster from zoom 13 straight to max
        // zoom 18) skips the smooth animated zoom entirely and just snaps to
        // the new view instantly. Raised well past this app's full min-to-max
        // zoom span (~12 to 18) so every zoom-in, however large, animates.
        zoomAnimationThreshold={10}
      >
        <MapZoomGuard />
        {satelliteOn ? (
          <TileLayer key="satellite" url={SATELLITE_TILE_URL} attribution={SATELLITE_ATTRIBUTION} />
        ) : (
          <>
            <TileLayer
              key="dark-base"
              url={DARK_TILE_URL}
              attribution={DARK_TILE_ATTRIBUTION}
              className="chitwan-base-tile"
            />
            <TileLayer key="dark-labels" url={DARK_LABEL_TILE_URL} className="chitwan-label-tile" />
          </>
        )}

        <PlaceLabelsLayer
          places={places}
          flats={pinsHidden ? [] : displayedFlats}
          pois={pinsHidden ? [] : [...schoolPois, ...generalPois]}
        />

        {!pinsHidden && (
          <>
            <FlatsLayer
              flats={displayedFlats}
              onSelect={(flat) => setExpandedItem({ type: "flat", data: flat })}
              onNearbyCluster={setNearbyFlatsPopup}
            />
            <ToletSpotsLayer
              spots={displayedToletSpots}
              onSelect={(spot) => setExpandedItem({ type: "tolet", data: spot })}
            />
            {schoolsOn && <PoisLayer pois={schoolPois} />}
            <GeneralPoisLayer pois={generalPois} />
          </>
        )}
        {busRoutesOn && <BusRoutesLayer routes={busRoutes} />}

        {areaStatsStep === "drawing" && <PinDropCatcher onPlace={handleAreaMapClick} />}
        {areaStatsStep === "drawing" && areaDrawCorner1 && (
          <Marker position={[areaDrawCorner1.lat, areaDrawCorner1.lng]} icon={areaCornerIcon} />
        )}
        {areaStatsStep === "adjusting" && areaBounds && (
          <AreaRectangleLayer bounds={areaBounds} onCornerDrag={handleAreaCornerDrag} />
        )}

        {toletPicking && (
          <PinDropCatcher
            onPlace={(latlng) => guardPinDrop(latlng, () => setToletPicking(false), handlePlaceToletPin)}
          />
        )}

        {listFlatFlow.step === "pin-drop" && (
          <PinDropCatcher onPlace={(latlng) => guardPinDrop(latlng, closeRouteModal, listFlatFlow.placePin)} />
        )}
        {listFlatFlow.step === "form" && listFlatFlow.draftPin && !listFlatPostStep && (
          <Marker
            position={[listFlatFlow.draftPin.lat, listFlatFlow.draftPin.lng]}
            icon={draftFlatIcon}
            draggable
            eventHandlers={{ dragend: (e) => listFlatFlow.dragPin(e.target.getLatLng()) }}
          />
        )}
        {listFlatPostStep && listFlatFlow.draftPin && yourPinIcon && (
          <Marker position={[listFlatFlow.draftPin.lat, listFlatFlow.draftPin.lng]} icon={yourPinIcon} />
        )}

        {findFlatFlow.step === "pin-drop" && (
          <PinDropCatcher onPlace={(latlng) => guardPinDrop(latlng, closeRouteModal, findFlatFlow.placePin)} />
        )}
        {findFlatFlow.step === "form" && findFlatFlow.draftPin && (
          <Marker
            position={[findFlatFlow.draftPin.lat, findFlatFlow.draftPin.lng]}
            icon={draftSeekerIcon}
            draggable
            eventHandlers={{ dragend: (e) => findFlatFlow.dragPin(e.target.getLatLng()) }}
          />
        )}

        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon} />}

        {searchResult && (
          <Marker
            position={[searchResult.lat, searchResult.lng]}
            icon={searchResultIcon}
            zIndexOffset={1000}
          />
        )}

        {!mapClickCaptured && !quickAction && <EmptyTapCatcher onEmptyTap={handleEmptyMapTap} />}
      </MapContainer>

      <div
        className={`pointer-events-none absolute inset-x-0 z-[1000] flex flex-col items-center gap-2 px-4 ${
          pushDown ? "top-16" : "top-4"
        }`}
      >
        {/* Hidden always-mounted clone, purely so the nav pill row's natural
            width can be measured at any time/viewport, even while a banner
            replaces the visible nav row. Every row below shares this one
            navRowWidth value instead of sizing independently. */}
        <div ref={navMeasureRef} className="pointer-events-none invisible absolute left-0 top-0" aria-hidden="true">
          <TopNavPill avlbFlatsActive={filters.availableOnly} onAvlbFlatsClick={() => {}} />
        </div>

        <div
          className={`pointer-events-auto w-full ${TOP_BAR_ROW_MAX_WIDTH_CLASS}`}
          style={navRowWidth ? { maxWidth: `${navRowWidth}px` } : undefined}
          // HowToUseTour spotlights the search bar here — only meaningful
          // in the default browsing state (topBarStatus null), which is
          // the only state the tour is ever open in.
          data-tour="search-bar"
        >
          {topBarStatus ? (
            <StatusBanner
              accent={topBarStatus.accent}
              title={topBarStatus.title}
              subtitle={topBarStatus.subtitle}
              onCancel={topBarStatus.onCancel}
            />
          ) : (
            <SearchBar
              value={searchValue}
              onChange={setSearchValue}
              areas={areas}
              places={places}
              onSelectLocation={handleSelectLocation}
              onFilterClick={() => setQuickModal("filters")}
              filterCount={filterCount}
              pulseFilter={filterPulse}
            />
          )}
        </div>

        <div
          className={`pointer-events-auto flex w-full ${TOP_BAR_ROW_MAX_WIDTH_CLASS} justify-center`}
          style={navRowWidth ? { maxWidth: `${navRowWidth}px` } : undefined}
          // HowToUseTour spotlights the nav pill row here — same caveat as
          // "search-bar" above.
          data-tour="nav-pill-row"
        >
          {topBarStatus ? (
            <SearchBar
              value={searchValue}
              onChange={setSearchValue}
              areas={areas}
              places={places}
              onSelectLocation={handleSelectLocation}
              onFilterClick={() => setQuickModal("filters")}
              filterCount={filterCount}
              pulseFilter={filterPulse}
            />
          ) : (
            <TopNavPill avlbFlatsActive={filters.availableOnly} onAvlbFlatsClick={handleAvlbFlatsClick} />
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <div className="pointer-events-auto">
          <IconStack
            onSpotToLet={() => withAuth(() => setQuickModal("spot-a-tolet"))}
            busRoutesOn={busRoutesOn}
            onToggleBusRoutes={() => setBusRoutesOn((v) => !v)}
            schoolsOn={schoolsOn}
            onToggleSchools={() => setSchoolsOn((v) => !v)}
            satelliteOn={satelliteOn}
            onToggleSatellite={() => setSatelliteOn((v) => !v)}
            onMore={() => setQuickModal("more")}
          />
        </div>
      </div>

      {location.pathname === "/how-to-use" && <HowToUseTour onClose={closeRouteModal} />}

      {listFlatFlow.step === "onboarding" && (
        <OnboardingModal
          onClose={closeRouteModal}
          onCta={listFlatFlow.proceedAfterOnboarding}
          dontShowAgainKey="list-my-flat"
          icon={KeyRound}
          title="Here's how it works"
          steps={LIST_MY_FLAT_STEPS}
        />
      )}

      {listFlatFlow.step === "form" && listFlatFlow.draftPin && !listFlatPostStep && (
        <AddFlatForm
          onCancel={listFlatFlow.cancelForm}
          onSubmit={handleSubmitFlatForm}
          submitting={false}
          submitError={null}
          area={listFlatFlow.draftPin.area}
        />
      )}

      {listFlatPostStep === "branch" && listFlatStep0Data && (
        <ListFlatBranchModal
          rentLabel={formatRsCompact(listFlatStep0Data.rent)}
          bhkLabel={bhkLabel(listFlatStep0Data.bhk)}
          onSelectFlat={() => handleSelectListFlatBranch("flat")}
          onSelectFlatmate={() => handleSelectListFlatBranch("flatmate")}
          onClose={handleCancelListFlatPostSteps}
        />
      )}

      {listFlatPostStep === "details" && listFlatStep0Data && listFlatBranch && (
        <ListFlatDetailsForm
          mode={listFlatBranch}
          rentLabel={formatRsCompact(listFlatStep0Data.rent)}
          bhkLabel={bhkLabel(listFlatStep0Data.bhk)}
          onBack={handleBackToListFlatBranch}
          onClose={handleCancelListFlatPostSteps}
          onSubmit={handleSubmitListFlatDetails}
          submitting={listFlatSubmitting}
          submitError={listFlatSubmitError}
        />
      )}

      {listFlatPostStep === "success" && listFlatCreatedFlat && (
        <ListFlatSuccessModal flat={listFlatCreatedFlat} onClose={handleCloseListFlatSuccess} />
      )}

      {findFlatFlow.step === "onboarding" && (
        <OnboardingModal
          onClose={closeRouteModal}
          onCta={findFlatFlow.proceedAfterOnboarding}
          dontShowAgainKey="find-a-flat"
          icon={Search}
          title="Here's how it works"
          steps={FIND_A_FLAT_STEPS}
        />
      )}

      {findFlatFlow.step === "form" && findFlatFlow.draftPin && (
        <DropSeekerPinForm
          lat={findFlatFlow.draftPin.lat}
          lng={findFlatFlow.draftPin.lng}
          onCancel={findFlatFlow.cancelForm}
          onSubmit={handleSubmitSeekerForm}
          submitting={findFlatSubmitting}
          submitError={findFlatSubmitError ? "Something went wrong — please try again." : null}
        />
      )}

      {archiveCheckState && (
        <ArchiveCheckPinsModal
          existingPins={archiveCheckState.existingPins}
          onArchiveSelectedAndAdd={handleArchiveCheckArchiveSelected}
          onKeepAllAndAdd={handleArchiveCheckKeepAll}
          onCancel={handleArchiveCheckCancel}
          submitting={findFlatSubmitting}
        />
      )}

      {location.pathname === "/superheroes" && (
        <SuperheroesModal
          onClose={closeRouteModal}
          onSpotToLet={() => {
            closeRouteModal();
            withAuth(() => setQuickModal("spot-a-tolet"));
          }}
        />
      )}

      {pendingAuthAction && (
        <AuthGateModal
          onSuccess={() => {
            const action = pendingAuthAction;
            setPendingAuthAction(null);
            action();
          }}
          onCancel={() => setPendingAuthAction(null)}
        />
      )}

      {toletPicking && (
        <PinDropBanner
          text="👆 Tap the map to set your board's location"
          accent="orange"
          onCancel={() => setToletPicking(false)}
        />
      )}

      {quickModal === "spot-a-tolet" && !toletPicking && (
        <SpotToLetModal
          photoDataUrl={toletPhoto}
          onPhotoChange={setToletPhoto}
          onFileSelect={setToletPhotoFile}
          name={toletName}
          onNameChange={setToletName}
          message={toletMessage}
          onMessageChange={setToletMessage}
          location={toletLocation}
          onUseGps={handleUseGps}
          onPickOnMap={handlePickToletOnMap}
          onSubmit={handleSubmitToletSpot}
          onCancel={handleCancelToletFlow}
          uploading={uploadToletPhoto.isPending}
          uploadError={uploadToletPhoto.isError ? "Couldn't upload photo — please try again." : null}
          submitting={createToletSpot.isPending}
          submitError={createToletSpot.isError ? "Something went wrong — please try again." : null}
        />
      )}

      {quickModal === "superheroes" && (
        <SuperheroesModal
          onClose={closeQuickModal}
          onSpotToLet={() => withAuth(() => setQuickModal("spot-a-tolet"))}
        />
      )}

      {quickModal === "more" && (
        <MoreModal
          onClose={closeQuickModal}
          onLocateMe={handleLocateMe}
          onToggleHidePins={handleToggleHidePins}
          pinsHidden={pinsHidden}
          onAreaStats={handleOpenAreaStats}
        />
      )}

      {areaStatsStep === "onboarding" && (
        <OnboardingModal
          onClose={resetAreaStatsFlow}
          onCta={() => setAreaStatsStep("drawing")}
          dontShowAgainKey="area-stats"
          icon={Ruler}
          title="Area Stats"
          subtitle="Draw any area on the map and instantly see rent breakdowns by BHK — for that specific neighbourhood, not the whole city."
          steps={AREA_STATS_STEPS}
          note="Toggle between All / Gated / Not Gated to compare inside the modal."
          ctaLabel="Got it"
        />
      )}

      {areaStatsDrawing && (
        <PinDropBanner text={areaStatsBannerText} accent="purple" onCancel={resetAreaStatsFlow} />
      )}

      {areaStatsStep === "adjusting" && (
        <button
          type="button"
          onClick={() => setAreaStatsStep("results")}
          className="pointer-events-auto fixed bottom-8 left-1/2 z-[1600] -translate-x-1/2 rounded-full bg-accent-purple px-6 py-3 text-sm font-bold text-white shadow-2xl transition hover:bg-accent-purple-light"
        >
          View Stats →
        </button>
      )}

      {areaStatsStep === "results" && areaBounds && (
        <AreaStatsResultsModal
          bounds={areaBounds}
          type={areaStatsType}
          onTypeChange={setAreaStatsType}
          onClose={resetAreaStatsFlow}
        />
      )}

      {quickModal === "filters" && (
        <FilterModal
          initialFilters={filters}
          onApply={setFilters}
          onClose={closeQuickModal}
        />
      )}

      {quickAction?.step === "chooser" && (
        <QuickActionModal
          onClose={() => setQuickAction(null)}
          onSelectRentReport={() => setQuickAction((qa) => ({ ...qa, step: "rent-report" }))}
          onSelectListFlat={handleQuickActionListFlat}
          onSelectFindFlat={handleQuickActionFindFlat}
          onSelectSpotToLet={handleQuickActionSpotToLet}
        />
      )}

      {quickAction?.step === "rent-report" && (
        <RentReportForm
          onCancel={() => setQuickAction(null)}
          onSubmit={handleSubmitRentReport}
          submitting={createRentReport.isPending}
          submitError={createRentReport.isError ? "Something went wrong — please try again." : null}
        />
      )}

      {outOfBoundsCancel && <OutOfBoundsModal onClose={dismissOutOfBounds} />}

      {selectedItem?.type === "seeker" && (
        <ListingChip
          stripColor="#14b8a6"
          title={`Looking · ${formatRs(selectedItem.data.budget)}`}
          subtitle={selectedItem.data.area}
          onExpand={() => setExpandedItem(selectedItem)}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {expandedItem?.type === "flat" && (
        <FlatDetailPanel
          flat={expandedItem.data}
          onClose={() => setExpandedItem(null)}
          onSeeAvailable={() => {
            setExpandedItem(null);
            handleAvlbFlatsClick();
          }}
        />
      )}

      {expandedItem?.type === "seeker" && (
        <SeekerDetailCard seeker={expandedItem.data} onClose={() => setExpandedItem(null)} />
      )}

      {expandedItem?.type === "tolet" && (
        <ToletSpotDetailCard spot={expandedItem.data} onClose={() => setExpandedItem(null)} />
      )}

      {nearbyFlatsPopup && (
        <NearbyFlatsModal
          flats={nearbyFlatsPopup}
          onSelectFlat={(flat) => {
            setNearbyFlatsPopup(null);
            setExpandedItem({ type: "flat", data: flat });
          }}
          onClose={() => setNearbyFlatsPopup(null)}
        />
      )}

      {showInitialLoad && <InitialLoadScreen fadingOut={!flatsLoading} />}

      {flatsLoading && !showInitialLoad && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-[900] -translate-x-1/2 rounded-full border border-white/10 bg-surface/90 px-4 py-2 text-xs font-semibold text-text-muted shadow-lg backdrop-blur-md">
          Loading flats…
        </div>
      )}
      {!flatsLoading && !showInitialLoad && displayedFlats.length === 0 && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-[900] -translate-x-1/2 rounded-full border border-white/10 bg-surface/90 px-4 py-2 text-xs font-semibold text-text-muted shadow-lg backdrop-blur-md">
          No flats match your filters
        </div>
      )}

      {locateError && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-[1600] -translate-x-1/2 rounded-full border border-white/10 bg-surface/90 px-4 py-2 text-xs font-semibold text-text-primary shadow-lg backdrop-blur-md">
          ⚠️ {locateError}
        </div>
      )}

      {showLanding && <LandingCard onDismiss={handleDismissLanding} areas={areas} />}
    </div>
  );
}
