import React, { memo } from "react";
import { CheckCircle, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTrip } from "@/context/TripContext";

interface CacheStatusProps {
  isLoading: boolean;
  isCached: boolean;
  onRefresh?: () => void;
  className?: string;
}

export const CacheStatus = memo(function CacheStatus({ isLoading, isCached, onRefresh, className = "" }: CacheStatusProps) {
  const { cachedData, isCacheValid } = useTrip();
  
  if (isLoading) {
    return (
      <Badge variant="secondary" className={`gap-1 ${className}`}>
        <Clock className="w-3 h-3 animate-spin" />
        Loading...
      </Badge>
    );
  }

  if (isCached || (cachedData && isCacheValid())) {
    const cacheAge = cachedData ? Math.floor((Date.now() - cachedData.lastFetched) / (1000 * 60)) : 0;
    
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
          <CheckCircle className="w-3 h-3" />
          Cached ({cacheAge}m ago)
        </Badge>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return null;
});