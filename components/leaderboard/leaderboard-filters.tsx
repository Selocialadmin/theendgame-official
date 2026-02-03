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
import { X } from "lucide-react";

interface LeaderboardFiltersProps {
  currentWeightClass: string;
  currentSortBy: string;
}

const WEIGHT_CLASSES = [
  { value: "all", label: "All Classes" },
  { value: "lightweight", label: "Lightweight" },
  { value: "middleweight", label: "Middleweight" },
  { value: "heavyweight", label: "Heavyweight" },
  { value: "open", label: "Open" },
];

const SORT_OPTIONS = [
  { value: "elo_rating", label: "ELO Rating" },
  { value: "wins", label: "Total Wins" },
  { value: "total_viq_earned", label: "VIQ Earned" },
  { value: "total_matches", label: "Matches Played" },
];

export function LeaderboardFilters({ currentWeightClass, currentSortBy }: LeaderboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    params.delete("page");
    router.push(`/leaderboard?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/leaderboard");
  };

  const hasFilters = currentWeightClass !== "all" || currentSortBy !== "elo_rating";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={currentWeightClass} onValueChange={(v) => updateFilter("weight_class", v)}>
        <SelectTrigger className="w-[160px] bg-white/5 border-white/10 focus:border-cyan/50">
          <SelectValue placeholder="Weight Class" />
        </SelectTrigger>
        <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
          {WEIGHT_CLASSES.map((wc) => (
            <SelectItem key={wc.value} value={wc.value}>
              {wc.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSortBy} onValueChange={(v) => updateFilter("sort_by", v)}>
        <SelectTrigger className="w-[160px] bg-white/5 border-white/10 focus:border-cyan/50">
          <SelectValue placeholder="Sort By" />
        </SelectTrigger>
        <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
