import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Compass, Camera, MoreHorizontal, KeyRound, Search, Award } from "lucide-react";
import {
  CHITWAN_CENTER,
  DEFAULT_ZOOM,
  DARK_TILE_URL,
  DARK_TILE_ATTRIBUTION,
  SATELLITE_TILE_URL,
  SATELLITE_ATTRIBUTION,
} from "../lib/mapConfig.js";
import { useFlats } from "../hooks/useFlats.js";
import { useSeekerPins } from "../hooks/useSeekerPins.js";
import { useAreas } from "../hooks/useAreas.js";
import { useToletSpots } from "../hooks/useToletSpots.js";
import { useCreateFlat } from "../hooks/useCreateFlat.js";
import { formatRs, bhkLabel } from "../lib/format.js";
import { DEFAULT_FILTERS, countActiveFilters } from "../lib/filters.js";
import { reverseGeocodeArea } from "../lib/geocode.js";
import { createDotIcon } from "../lib/mapIcons.jsx";
import TopNavPill from "./TopNavPill.jsx";
import SearchBar from "./SearchBar.jsx";
import IconStack from "./IconStack.jsx";
import OnboardingModal, { isOnboardingDismissed } from "./OnboardingModal.jsx";
import StubModal from "./StubModal.jsx";
import FilterModal from "./FilterModal.jsx";
import FlatsLayer from "./FlatsLayer.jsx";
import SeekersLayer from "./SeekersLayer.jsx";
import ToletSpotsLayer from "./ToletSpotsLayer.jsx";
import ListingChip from "./ListingChip.jsx";
import FlatDetailCard from "./FlatDetailCard.jsx";
import SeekerDetailCard from "./SeekerDetailCard.jsx";
import PinDropBanner from "./PinDropBanner.jsx";
import PinDropCatcher from "./PinDropCatcher.jsx";
import AddFlatForm from "./AddFlatForm.jsx";

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

const draftFlatIcon = createDotIcon(KeyRound, { bg: "#7c3aed", size: 32 });

export default function MapShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [searchValue, setSearchValue] = useState("");
  const [quickModal, setQuickModal] = useState(null); // 'spot-a-tolet' | 'more' | 'filters' | null

  const [satelliteOn, setSatelliteOn] = useState(false);
  const [busRoutesOn, setBusRoutesOn] = useState(false);
  const [greenCoverOn, setGreenCoverOn] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const filterCount = countActiveFilters(filters);

  const { data: flats = [] } = useFlats(filters);
  const { data: seekerPins = [] } = useSeekerPins();
  const { data: areas = [] } = useAreas();
  const { data: toletSpots = [] } = useToletSpots(filters.showToletBoards);

  const [selectedItem, setSelectedItem] = useState(null); // { type: 'flat'|'seeker', data } | null
  const [expandedItem, setExpandedItem] = useState(null); // same shape, drives the full detail card

  // List My Flat flow: 'onboarding' -> 'pin-drop' -> 'form'
  const [listFlatStep, setListFlatStep] = useState(null);
  const [draftFlatPin, setDraftFlatPin] = useState(null); // { lat, lng, area }
  const [justSubmittedFlats, setJustSubmittedFlats] = useState([]);
  const createFlat = useCreateFlat();

  useEffect(() => {
    if (location.pathname === "/list-my-flat") {
      setListFlatStep(isOnboardingDismissed("list-my-flat") ? "pin-drop" : "onboarding");
      setDraftFlatPin(null);
    } else {
      setListFlatStep(null);
      setDraftFlatPin(null);
    }
  }, [location.pathname]);

  const displayedFlats = useMemo(() => {
    if (!justSubmittedFlats.length) return flats;
    const existingIds = new Set(flats.map((f) => f.id));
    return [...flats, ...justSubmittedFlats.filter((f) => !existingIds.has(f.id))];
  }, [flats, justSubmittedFlats]);

  const closeRouteModal = () => navigate("/");
  const closeQuickModal = () => setQuickModal(null);

  const handleSelectLocation = (suggestion) => {
    mapRef.current?.flyTo([suggestion.lat, suggestion.lng], 15, { duration: 1.2 });
  };

  const handlePlaceFlatPin = async (latlng) => {
    const { lat, lng } = latlng;
    setDraftFlatPin({ lat, lng, area: null });
    setListFlatStep("form");
    const area = await reverseGeocodeArea(lat, lng, areas);
    setDraftFlatPin((p) => (p && p.lat === lat && p.lng === lng ? { ...p, area } : p));
  };

  const handleDragFlatPin = async (latlng) => {
    const { lat, lng } = latlng;
    setDraftFlatPin({ lat, lng, area: null });
    const area = await reverseGeocodeArea(lat, lng, areas);
    setDraftFlatPin((p) => (p && p.lat === lat && p.lng === lng ? { ...p, area } : p));
  };

  const handleCancelFlatForm = () => {
    setDraftFlatPin(null);
    setListFlatStep("pin-drop");
  };

  const handleSubmitFlatForm = async (form) => {
    if (!draftFlatPin) return;
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
        lat: draftFlatPin.lat,
        lng: draftFlatPin.lng,
        area: draftFlatPin.area,
        photos: [],
      });
      setJustSubmittedFlats((prev) => [...prev, created]);
      mapRef.current?.flyTo([created.lat, created.lng], 16, { duration: 1 });
      setListFlatStep(null);
      setDraftFlatPin(null);
      navigate("/");
    } catch {
      // error surfaced via createFlat.isError in the form
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg">
      <MapContainer
        ref={mapRef}
        center={CHITWAN_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="absolute inset-0 z-0"
      >
        {satelliteOn ? (
          <TileLayer key="satellite" url={SATELLITE_TILE_URL} attribution={SATELLITE_ATTRIBUTION} />
        ) : (
          <TileLayer key="dark" url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />
        )}

        <FlatsLayer flats={displayedFlats} onSelect={(flat) => setSelectedItem({ type: "flat", data: flat })} />
        <SeekersLayer
          seekerPins={seekerPins}
          onSelect={(seeker) => setSelectedItem({ type: "seeker", data: seeker })}
        />
        {filters.showToletBoards && <ToletSpotsLayer spots={toletSpots} />}

        {listFlatStep === "pin-drop" && <PinDropCatcher onPlace={handlePlaceFlatPin} />}
        {listFlatStep === "form" && draftFlatPin && (
          <Marker
            position={[draftFlatPin.lat, draftFlatPin.lng]}
            icon={draftFlatIcon}
            draggable
            eventHandlers={{ dragend: (e) => handleDragFlatPin(e.target.getLatLng()) }}
          />
        )}
      </MapContainer>

      {greenCoverOn && (
        <div className="pointer-events-none absolute inset-0 z-[10] bg-emerald-500/10" />
      )}

      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <div className="pointer-events-auto">
          <TopNavPill pushDown={listFlatStep === "pin-drop"} />
        </div>
        <div className="pointer-events-auto">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            areas={areas}
            onSelectLocation={handleSelectLocation}
            onFilterClick={() => setQuickModal("filters")}
            filterCount={filterCount}
            pushDown={listFlatStep === "pin-drop"}
          />
        </div>
        <div className="pointer-events-auto">
          <IconStack
            onSpotToLet={() => setQuickModal("spot-a-tolet")}
            busRoutesOn={busRoutesOn}
            onToggleBusRoutes={() => setBusRoutesOn((v) => !v)}
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

      {listFlatStep === "onboarding" && (
        <OnboardingModal
          onClose={closeRouteModal}
          onCta={() => setListFlatStep("pin-drop")}
          dontShowAgainKey="list-my-flat"
          icon={KeyRound}
          title="Here's how it works"
          steps={LIST_MY_FLAT_STEPS}
        />
      )}

      {listFlatStep === "pin-drop" && (
        <PinDropBanner
          text="👆 Tap your flat's location on the map to place your pin"
          accent="purple"
          onCancel={closeRouteModal}
        />
      )}

      {listFlatStep === "form" && draftFlatPin && (
        <AddFlatForm
          onCancel={handleCancelFlatForm}
          onSubmit={handleSubmitFlatForm}
          submitting={createFlat.isPending}
          submitError={createFlat.isError ? "Something went wrong — please try again." : null}
          area={draftFlatPin.area}
        />
      )}

      {location.pathname === "/find-a-flat" && (
        <StubModal
          onClose={closeRouteModal}
          icon={Search}
          title="Find a Flat"
          subtitle="Drop a seeker pin and get matched with flats and flatmates nearby."
          phaseNote="The full pin-drop and seeker flow arrives in Phase 5."
        />
      )}

      {location.pathname === "/superheroes" && (
        <StubModal
          onClose={closeRouteModal}
          icon={Award}
          title="Chitwan's Rental Superheroes"
          subtitle="They walk the streets so you don't have to."
          phaseNote="The full leaderboard and Spot a To-Let flow arrives in Phase 6."
        />
      )}

      {quickModal === "spot-a-tolet" && (
        <StubModal
          onClose={closeQuickModal}
          icon={Camera}
          title="Spot a To-Let"
          subtitle="See a To-Let board? Put it on the map."
          phaseNote="This flow arrives in Phase 6."
        />
      )}

      {quickModal === "more" && (
        <StubModal
          onClose={closeQuickModal}
          icon={MoreHorizontal}
          title="More tools"
          subtitle="Locate me, hide pins, and area stats."
          phaseNote="These tools arrive in Phase 8."
        />
      )}

      {quickModal === "filters" && (
        <FilterModal
          initialFilters={filters}
          onApply={setFilters}
          onClose={closeQuickModal}
        />
      )}

      {selectedItem?.type === "flat" && (
        <ListingChip
          stripColor="#7c3aed"
          title={`${bhkLabel(selectedItem.data.bhk)} · ${formatRs(selectedItem.data.rent)}`}
          subtitle={selectedItem.data.area}
          onExpand={() => setExpandedItem(selectedItem)}
          onClose={() => setSelectedItem(null)}
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
        <FlatDetailCard flat={expandedItem.data} onClose={() => setExpandedItem(null)} />
      )}

      {expandedItem?.type === "seeker" && (
        <SeekerDetailCard seeker={expandedItem.data} onClose={() => setExpandedItem(null)} />
      )}
    </div>
  );
}
