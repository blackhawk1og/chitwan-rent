import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer } from "react-leaflet";
import { Compass, Camera, MoreHorizontal, KeyRound, Search, Award, SlidersHorizontal } from "lucide-react";
import {
  CHITWAN_CENTER,
  DEFAULT_ZOOM,
  DARK_TILE_URL,
  DARK_TILE_ATTRIBUTION,
  SATELLITE_TILE_URL,
  SATELLITE_ATTRIBUTION,
} from "../lib/mapConfig.js";
import TopNavPill from "./TopNavPill.jsx";
import SearchBar from "./SearchBar.jsx";
import IconStack from "./IconStack.jsx";
import OnboardingModal from "./OnboardingModal.jsx";
import StubModal from "./StubModal.jsx";

const HOW_TO_USE_STEPS = [
  "Browse available flats and flatmate-seeker pins on the map",
  "Search or filter by BHK, rent, neighbourhood, and more",
  "List your flat or drop a seeker pin in a few taps",
  "Spot a To-Let board on your walk and become a rental Superhero",
];

export default function MapShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState("");
  const [quickModal, setQuickModal] = useState(null); // 'spot-a-tolet' | 'more' | 'filters' | null

  const [satelliteOn, setSatelliteOn] = useState(false);
  const [busRoutesOn, setBusRoutesOn] = useState(false);
  const [greenCoverOn, setGreenCoverOn] = useState(false);

  const closeRouteModal = () => navigate("/");
  const closeQuickModal = () => setQuickModal(null);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg">
      <MapContainer
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
      </MapContainer>

      {greenCoverOn && (
        <div className="pointer-events-none absolute inset-0 z-[10] bg-emerald-500/10" />
      )}

      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <div className="pointer-events-auto">
          <TopNavPill />
        </div>
        <div className="pointer-events-auto">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            onFilterClick={() => setQuickModal("filters")}
            filterCount={0}
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

      {location.pathname === "/list-my-flat" && (
        <StubModal
          onClose={closeRouteModal}
          icon={KeyRound}
          title="List My Flat"
          subtitle="Drop a pin, fill in rent details, and get matched with seekers."
          phaseNote="The full pin-drop and listing flow arrives in Phase 4."
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
        <StubModal
          onClose={closeQuickModal}
          icon={SlidersHorizontal}
          title="Filters"
          subtitle="Customize the way you see chitwan.rent."
          phaseNote="The full filter modal arrives in Phase 3."
        />
      )}
    </div>
  );
}
