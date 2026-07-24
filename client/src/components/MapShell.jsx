import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Compass, KeyRound, Search, Ruler } from "lucide-react";
import {
  CHITWAN_CENTER,
  DEFAULT_ZOOM,
  CHITWAN_BOUNDS,
  DARK_TILE_URL,
  DARK_TILE_ATTRIBUTION,
  SATELLITE_TILE_URL,
  SATELLITE_ATTRIBUTION,
} from "../lib/mapConfig.js";
import { useFlats } from "../hooks/useFlats.js";
import { useSeekerPins } from "../hooks/useSeekerPins.js";
import { useAreas } from "../hooks/useAreas.js";
import { useToletSpots } from "../hooks/useToletSpots.js";
import { useBusRoutes } from "../hooks/useBusRoutes.js";
import { usePois } from "../hooks/usePois.js";
import { useCreateFlat } from "../hooks/useCreateFlat.js";
import { useCreateSeekerPin } from "../hooks/useCreateSeekerPin.js";
import { useCreateToletSpot } from "../hooks/useCreateToletSpot.js";
import { usePinDropFlow } from "../hooks/usePinDropFlow.js";
import { formatRs } from "../lib/format.js";
import { DEFAULT_FILTERS, countActiveFilters } from "../lib/filters.js";
import { createDotIcon, createHandleIcon } from "../lib/mapIcons.jsx";
import TopNavPill from "./TopNavPill.jsx";
import SearchBar from "./SearchBar.jsx";
import IconStack from "./IconStack.jsx";
import OnboardingModal, { isOnboardingDismissed } from "./OnboardingModal.jsx";
import FilterModal from "./FilterModal.jsx";
import FlatsLayer from "./FlatsLayer.jsx";
import SeekersLayer from "./SeekersLayer.jsx";
import ToletSpotsLayer from "./ToletSpotsLayer.jsx";
import BusRoutesLayer from "./BusRoutesLayer.jsx";
import PoisLayer from "./PoisLayer.jsx";
import ListingChip from "./ListingChip.jsx";
import FlatDetailPanel from "./FlatDetailPanel.jsx";
import SeekerDetailCard from "./SeekerDetailCard.jsx";
import MapZoomGuard from "./MapZoomGuard.jsx";
import PinDropBanner from "./PinDropBanner.jsx";
import AvlbFlatsBanner from "./AvlbFlatsBanner.jsx";
import PinDropCatcher from "./PinDropCatcher.jsx";
import AddFlatForm from "./AddFlatForm.jsx";
import DropSeekerPinForm from "./DropSeekerPinForm.jsx";
import SpotToLetModal from "./SpotToLetModal.jsx";
import SuperheroesModal from "./SuperheroesModal.jsx";
import SuperheroesPage from "./SuperheroesPage.jsx";
import MoreModal from "./MoreModal.jsx";
import AreaRectangleLayer from "./AreaRectangleLayer.jsx";
import AreaStatsResultsModal from "./AreaStatsResultsModal.jsx";
import AuthGateModal from "./AuthGateModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const HOW_TO_USE_STEPS = [
  "Browse available flats and flatmate-seeker pins on the map",
  "Search or filter by BHK, rent, neighbourhood, and more",
  "List your flat or drop a seeker pin in a few taps",
  "Spot a To-Let board on your walk and become a rental Superhero",
];

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

const draftFlatIcon = createDotIcon(KeyRound, { bg: "#7c3aed", size: 32 });
const draftSeekerIcon = createDotIcon(Search, { bg: "#14b8a6", size: 32 });
const areaCornerIcon = createHandleIcon();

export default function MapShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const { isAuthenticated } = useAuth();

  // Generic auth gate for actions that aren't tied to a route (Spot a To-Let).
  // Route-based flows (List My Flat / Find a Flat) gate via usePinDropFlow instead.
  const [pendingAuthAction, setPendingAuthAction] = useState(null);
  const withAuth = (action) => {
    if (isAuthenticated) action();
    else setPendingAuthAction(() => action);
  };

  const [searchValue, setSearchValue] = useState("");
  const [quickModal, setQuickModal] = useState(null); // 'spot-a-tolet' | 'more' | 'filters' | null

  const [satelliteOn, setSatelliteOn] = useState(false);
  const [busRoutesOn, setBusRoutesOn] = useState(false);
  const [schoolsOn, setSchoolsOn] = useState(false);
  const [greenCoverOn, setGreenCoverOn] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const filterCount = countActiveFilters(filters);

  const { data: flats = [], isLoading: flatsLoading } = useFlats(filters);
  const { data: seekerPins = [] } = useSeekerPins();
  const { data: areas = [] } = useAreas();
  const { data: toletSpots = [] } = useToletSpots(filters.showToletBoards);
  const { data: busRoutes = [] } = useBusRoutes(busRoutesOn);
  const { data: schoolPois = [] } = usePois("school,college", schoolsOn);

  const [selectedItem, setSelectedItem] = useState(null); // { type: 'flat'|'seeker', data } | null
  const [expandedItem, setExpandedItem] = useState(null); // same shape, drives the full detail card

  const [justSubmittedFlats, setJustSubmittedFlats] = useState([]);
  const [justSubmittedSeekerPins, setJustSubmittedSeekerPins] = useState([]);
  const [justSubmittedToletSpots, setJustSubmittedToletSpots] = useState([]);
  const createFlat = useCreateFlat();
  const createSeekerPin = useCreateSeekerPin();
  const createToletSpot = useCreateToletSpot();

  const listFlatFlow = usePinDropFlow({
    routePath: "/list-my-flat",
    onboardingKey: "list-my-flat",
    areas,
    isAuthenticated,
  });
  const findFlatFlow = usePinDropFlow({
    routePath: "/find-a-flat",
    onboardingKey: "find-a-flat",
    areas,
    isAuthenticated,
  });

  // Spot a To-Let: its own lightweight flow — no onboarding step, and the
  // form's fields must survive the "pick on map" detour, so they're lifted
  // up here rather than living inside the (temporarily unmounted) modal.
  const [toletPhoto, setToletPhoto] = useState(null);
  const [toletName, setToletName] = useState("");
  const [toletMessage, setToletMessage] = useState("");
  const [toletLocation, setToletLocation] = useState(null);
  const [toletPicking, setToletPicking] = useState(false);

  const [pinsHidden, setPinsHidden] = useState(false);

  // Area Stats: 'onboarding' -> 'drawing' (2 taps) -> 'adjusting' (drag corners) -> 'results'
  const [areaStatsStep, setAreaStatsStep] = useState(null);
  const [areaDrawCorner1, setAreaDrawCorner1] = useState(null);
  const [areaBounds, setAreaBounds] = useState(null); // { north, south, east, west }
  const [areaStatsType, setAreaStatsType] = useState("all");

  const areaStatsDrawing = areaStatsStep === "drawing" || areaStatsStep === "adjusting";
  const pushDown = listFlatFlow.step === "pin-drop" || findFlatFlow.step === "pin-drop" || toletPicking || areaStatsDrawing;

  const displayedFlats = useMemo(() => {
    if (!justSubmittedFlats.length) return flats;
    const existingIds = new Set(flats.map((f) => f.id));
    return [...flats, ...justSubmittedFlats.filter((f) => !existingIds.has(f.id))];
  }, [flats, justSubmittedFlats]);

  const displayedSeekerPins = useMemo(() => {
    if (!justSubmittedSeekerPins.length) return seekerPins;
    const existingIds = new Set(seekerPins.map((s) => s.id));
    return [...seekerPins, ...justSubmittedSeekerPins.filter((s) => !existingIds.has(s.id))];
  }, [seekerPins, justSubmittedSeekerPins]);

  const displayedToletSpots = useMemo(() => {
    const base = filters.showToletBoards ? toletSpots : [];
    const existingIds = new Set(base.map((s) => s.id));
    return [...base, ...justSubmittedToletSpots.filter((s) => !existingIds.has(s.id))];
  }, [filters.showToletBoards, toletSpots, justSubmittedToletSpots]);

  const closeRouteModal = () => navigate("/");
  const closeQuickModal = () => setQuickModal(null);

  const handleSelectLocation = (suggestion) => {
    mapRef.current?.flyTo([suggestion.lat, suggestion.lng], 15, { duration: 1.2 });
  };

  const handleAvlbFlatsClick = () => {
    if (location.pathname !== "/") navigate("/");
    setFilters((f) => ({ ...f, availableOnly: true }));
  };

  const handleCancelAvlbFlats = () => {
    setFilters((f) => ({ ...f, availableOnly: false }));
  };

  const handleSubmitFlatForm = async (form) => {
    if (!listFlatFlow.draftPin) return;
    try {
      const created = await createFlat.mutateAsync({
        listing_type: "flat",
        bhk: form.bhk,
        rent: Number(form.rent),
        deposit: form.deposit === "" ? null : Number(form.deposit),
        furnishing: form.furnishing,
        includes_maintenance: form.includesMaintenance,
        gated: form.gated,
        who_lives: form.whoLives,
        pets_allowed: form.petsAllowed,
        parking_for: Number(form.parkingFor),
        sqft: form.sqft === "" ? null : Number(form.sqft),
        one_liner: form.oneLiner || null,
        email: form.email || null,
        lat: listFlatFlow.draftPin.lat,
        lng: listFlatFlow.draftPin.lng,
        area: listFlatFlow.draftPin.area,
        photos: [],
      });
      setJustSubmittedFlats((prev) => [...prev, created]);
      mapRef.current?.flyTo([created.lat, created.lng], 16, { duration: 1 });
      listFlatFlow.finish();
      navigate("/");
    } catch {
      // error surfaced via createFlat.isError in the form
    }
  };

  const handleSubmitSeekerForm = async (form) => {
    if (!findFlatFlow.draftPin) return;
    try {
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
      });
      setJustSubmittedSeekerPins((prev) => [...prev, created]);
      mapRef.current?.flyTo([created.lat, created.lng], 16, { duration: 1 });
      findFlatFlow.finish();
      navigate("/");
    } catch {
      // error surfaced via createSeekerPin.isError in the form
    }
  };

  const resetToletFlow = () => {
    setToletPhoto(null);
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

  const handleSubmitToletSpot = async () => {
    if (!toletPhoto || !toletLocation) return;
    try {
      const created = await createToletSpot.mutateAsync({
        photo_url: toletPhoto,
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
      // error surfaced via createToletSpot.isError in the form
    }
  };

  const handleLocateMe = () => {
    closeQuickModal();
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1.2 });
    });
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
        maxBounds={CHITWAN_BOUNDS}
        maxBoundsViscosity={1.0}
        className="absolute inset-0 z-0"
      >
        <MapZoomGuard />
        {satelliteOn ? (
          <TileLayer key="satellite" url={SATELLITE_TILE_URL} attribution={SATELLITE_ATTRIBUTION} />
        ) : (
          <TileLayer key="dark" url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />
        )}

        {!pinsHidden && (
          <>
            <FlatsLayer flats={displayedFlats} onSelect={(flat) => setExpandedItem({ type: "flat", data: flat })} />
            <SeekersLayer
              seekerPins={displayedSeekerPins}
              onSelect={(seeker) => setSelectedItem({ type: "seeker", data: seeker })}
            />
            <ToletSpotsLayer spots={displayedToletSpots} />
            {schoolsOn && <PoisLayer pois={schoolPois} />}
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

        {toletPicking && <PinDropCatcher onPlace={handlePlaceToletPin} />}

        {listFlatFlow.step === "pin-drop" && <PinDropCatcher onPlace={listFlatFlow.placePin} />}
        {listFlatFlow.step === "form" && listFlatFlow.draftPin && (
          <Marker
            position={[listFlatFlow.draftPin.lat, listFlatFlow.draftPin.lng]}
            icon={draftFlatIcon}
            draggable
            eventHandlers={{ dragend: (e) => listFlatFlow.dragPin(e.target.getLatLng()) }}
          />
        )}

        {findFlatFlow.step === "pin-drop" && <PinDropCatcher onPlace={findFlatFlow.placePin} />}
        {findFlatFlow.step === "form" && findFlatFlow.draftPin && (
          <Marker
            position={[findFlatFlow.draftPin.lat, findFlatFlow.draftPin.lng]}
            icon={draftSeekerIcon}
            draggable
            eventHandlers={{ dragend: (e) => findFlatFlow.dragPin(e.target.getLatLng()) }}
          />
        )}
      </MapContainer>

      {greenCoverOn && (
        <div className="pointer-events-none absolute inset-0 z-[10] bg-emerald-500/10" />
      )}

      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <div className="pointer-events-auto">
          <TopNavPill
            pushDown={pushDown}
            avlbFlatsActive={filters.availableOnly}
            onAvlbFlatsClick={handleAvlbFlatsClick}
          />
        </div>
        <div className="pointer-events-auto">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            areas={areas}
            onSelectLocation={handleSelectLocation}
            onFilterClick={() => setQuickModal("filters")}
            filterCount={filterCount}
            pushDown={pushDown}
          />
        </div>
        {filters.availableOnly && (
          <div className="pointer-events-auto">
            <AvlbFlatsBanner onCancel={handleCancelAvlbFlats} />
          </div>
        )}
        <div className="pointer-events-auto">
          <IconStack
            onSpotToLet={() => withAuth(() => setQuickModal("spot-a-tolet"))}
            busRoutesOn={busRoutesOn}
            onToggleBusRoutes={() => setBusRoutesOn((v) => !v)}
            schoolsOn={schoolsOn}
            onToggleSchools={() => setSchoolsOn((v) => !v)}
            satelliteOn={satelliteOn}
            onToggleSatellite={() => setSatelliteOn((v) => !v)}
            greenCoverOn={greenCoverOn}
            onToggleGreenCover={() => setGreenCoverOn((v) => !v)}
            onMore={() => setQuickModal("more")}
          />
        </div>
      </div>

      {location.pathname === "/how-to-use" && (
        <OnboardingModal
          onClose={closeRouteModal}
          icon={Compass}
          title="Here's how it works"
          steps={HOW_TO_USE_STEPS}
          ctaLabel="Got it, let's go"
        />
      )}

      {listFlatFlow.step === "auth" && (
        <AuthGateModal onSuccess={listFlatFlow.proceedAfterAuth} onCancel={closeRouteModal} />
      )}

      {listFlatFlow.step === "onboarding" && (
        <OnboardingModal
          onClose={closeRouteModal}
          onCta={() => listFlatFlow.setStep("pin-drop")}
          dontShowAgainKey="list-my-flat"
          icon={KeyRound}
          title="Here's how it works"
          steps={LIST_MY_FLAT_STEPS}
        />
      )}

      {listFlatFlow.step === "pin-drop" && (
        <PinDropBanner
          text="👆 Tap your flat's location on the map to place your pin"
          accent="purple"
          onCancel={closeRouteModal}
        />
      )}

      {listFlatFlow.step === "form" && listFlatFlow.draftPin && (
        <AddFlatForm
          onCancel={listFlatFlow.cancelForm}
          onSubmit={handleSubmitFlatForm}
          submitting={createFlat.isPending}
          submitError={createFlat.isError ? "Something went wrong — please try again." : null}
          area={listFlatFlow.draftPin.area}
        />
      )}

      {findFlatFlow.step === "auth" && (
        <AuthGateModal onSuccess={findFlatFlow.proceedAfterAuth} onCancel={closeRouteModal} />
      )}

      {findFlatFlow.step === "onboarding" && (
        <OnboardingModal
          onClose={closeRouteModal}
          onCta={() => findFlatFlow.setStep("pin-drop")}
          dontShowAgainKey="find-a-flat"
          icon={Search}
          title="Here's how it works"
          steps={FIND_A_FLAT_STEPS}
        />
      )}

      {findFlatFlow.step === "pin-drop" && (
        <PinDropBanner
          text="👆 Tap anywhere on the map to place your pin"
          accent="teal"
          onCancel={closeRouteModal}
        />
      )}

      {findFlatFlow.step === "form" && findFlatFlow.draftPin && (
        <DropSeekerPinForm
          lat={findFlatFlow.draftPin.lat}
          lng={findFlatFlow.draftPin.lng}
          onCancel={findFlatFlow.cancelForm}
          onSubmit={handleSubmitSeekerForm}
          submitting={createSeekerPin.isPending}
          submitError={createSeekerPin.isError ? "Something went wrong — please try again." : null}
        />
      )}

      {location.pathname === "/superheroes" && <SuperheroesPage onClose={closeRouteModal} />}

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
          name={toletName}
          onNameChange={setToletName}
          message={toletMessage}
          onMessageChange={setToletMessage}
          location={toletLocation}
          onUseGps={handleUseGps}
          onPickOnMap={handlePickToletOnMap}
          onSubmit={handleSubmitToletSpot}
          onCancel={handleCancelToletFlow}
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
        <FlatDetailPanel flat={expandedItem.data} onClose={() => setExpandedItem(null)} />
      )}

      {expandedItem?.type === "seeker" && (
        <SeekerDetailCard seeker={expandedItem.data} onClose={() => setExpandedItem(null)} />
      )}

      {flatsLoading && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-[900] -translate-x-1/2 rounded-full border border-white/10 bg-surface/90 px-4 py-2 text-xs font-semibold text-text-muted shadow-lg backdrop-blur-md">
          Loading flats…
        </div>
      )}
      {!flatsLoading && displayedFlats.length === 0 && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-[900] -translate-x-1/2 rounded-full border border-white/10 bg-surface/90 px-4 py-2 text-xs font-semibold text-text-muted shadow-lg backdrop-blur-md">
          No flats match your filters
        </div>
      )}
    </div>
  );
}
