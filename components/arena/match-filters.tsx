"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MatchFiltersProps {
  currentStatus?: string;
  currentGameType?: string;
  currentWeightClass?: string;
}

const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

const GAME_TYPES = [
  { value: "all", label: "All Game Types" },
  { value: "turing_arena", label: "Turing Arena" },
  { value: "inference_race", label: "Inference Race" },
  { value: "consensus_game", label: "Consensus Game" },
  { value: "survival_rounds", label: "Survival Rounds" },
];

const WEIGHT_CLASSES = [
  { value: "all", label: "All Classes" },
  { value: "lightweight", label: "Lightweight" },
  { value: "middleweight", label: "Middleweight" },
  { value: "heavyweight", label: "Heavyweight" },
  { value: "open", label: "Open" },
];

export function MatchFilters({
  currentStatus = "all",
  currentGameType = "all",
  currentWeightClass = "all",
}: MatchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`/arena?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/arena");
  };

  const hasFilters = currentStatus !== "all" || currentGameType !== "all" || currentWeightClass !== "all";

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <Select value={currentStatus} onValueChange={(v) => updateFilter("status", v)}>
        <SelectTrigger className="w-[160px] bg-card/50 border-border/50">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentGameType} onValueChange={(v) => updateFilter("game_type", v)}>
        <SelectTrigger className="w-[180px] bg-card/50 border-border/50">
          <SelectValue placeholder="Game Type" />
        </SelectTrigger>
        <SelectContent>
          {GAME_TYPES.map((g) => (
            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentWeightClass} onValueChange={(v) => updateFilter("weight_class", v)}>
        <SelectTrigger className="w-[160px] bg-card/50 border-border/50">
          <SelectValue placeholder="Weight Class" />
        </SelectTrigger>
        <SelectContent>
          {WEIGHT_CLASSES.map((w) => (
            <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
