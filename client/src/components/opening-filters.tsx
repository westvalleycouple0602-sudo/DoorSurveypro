import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { useState } from "react";

export interface OpeningFilterState {
  doorType: string;
  fireRating: string;
  hardwareGrade: string;
}

interface OpeningFiltersProps {
  filters: OpeningFilterState;
  onFiltersChange: (filters: OpeningFilterState) => void;
  activeFilterCount: number;
}

export function OpeningFilters({ filters, onFiltersChange, activeFilterCount }: OpeningFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const clearFilters = () => {
    onFiltersChange({
      doorType: "all",
      fireRating: "all",
      hardwareGrade: "all",
    });
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          data-testid="button-toggle-opening-filters"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1" data-testid="badge-opening-filter-count">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            data-testid="button-clear-opening-filters"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {showFilters && (
        <Card className="animate-fade-in" data-testid="card-opening-filters">
          <CardContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Door Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Door Type</label>
                <Select
                  value={filters.doorType}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, doorType: value })
                  }
                >
                  <SelectTrigger data-testid="select-door-type-filter">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="single_hinged">Single Hinged</SelectItem>
                    <SelectItem value="double_hinged">Double Hinged</SelectItem>
                    <SelectItem value="sliding">Sliding</SelectItem>
                    <SelectItem value="folding">Folding</SelectItem>
                    <SelectItem value="overhead">Overhead</SelectItem>
                    <SelectItem value="revolving">Revolving</SelectItem>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="pivot">Pivot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fire Rating Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Fire Rating</label>
                <Select
                  value={filters.fireRating}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, fireRating: value })
                  }
                >
                  <SelectTrigger data-testid="select-fire-rating-filter">
                    <SelectValue placeholder="All ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ratings</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="20min">20 minutes</SelectItem>
                    <SelectItem value="45min">45 minutes</SelectItem>
                    <SelectItem value="60min">60 minutes</SelectItem>
                    <SelectItem value="90min">90 minutes</SelectItem>
                    <SelectItem value="120min">120 minutes</SelectItem>
                    <SelectItem value="180min">180 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hardware Grade Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Hardware Grade</label>
                <Select
                  value={filters.hardwareGrade}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, hardwareGrade: value })
                  }
                >
                  <SelectTrigger data-testid="select-hardware-grade-filter">
                    <SelectValue placeholder="All grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All grades</SelectItem>
                    <SelectItem value="grade1">Grade 1 (Heavy Duty)</SelectItem>
                    <SelectItem value="grade2">Grade 2 (Standard)</SelectItem>
                    <SelectItem value="grade3">Grade 3 (Light Duty)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
