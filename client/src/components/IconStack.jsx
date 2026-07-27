import { Camera, Bus, GraduationCap, Satellite, MoreHorizontal } from "lucide-react";

function StackButton({ icon: Icon, label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition ${
          active
            ? "border-accent-purple bg-accent-purple text-white"
            : "border-white/10 bg-surface/90 text-text-primary hover:bg-white/10"
        }`}
      >
        <Icon size={18} />
      </span>
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
    </button>
  );
}

export default function IconStack({
  onSpotToLet,
  busRoutesOn,
  onToggleBusRoutes,
  schoolsOn,
  onToggleSchools,
  satelliteOn,
  onToggleSatellite,
  onMore,
}) {
  return (
    <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-5">
      <StackButton icon={Camera} label="Spot a To-Let" onClick={onSpotToLet} />
      <StackButton icon={Bus} label="Bus Routes" active={busRoutesOn} onClick={onToggleBusRoutes} />
      <StackButton icon={GraduationCap} label="Schools" active={schoolsOn} onClick={onToggleSchools} />
      <StackButton icon={Satellite} label="Satellite" active={satelliteOn} onClick={onToggleSatellite} />
      <StackButton icon={MoreHorizontal} label="More" onClick={onMore} />
    </div>
  );
}
