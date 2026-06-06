import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useCitySearch, CitySearchResult } from "@/hooks/useCitySearch";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CityAutocompleteProps {
  value: string;
  onChange: (city: CitySearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function CityAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Search city...",
  className 
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const { results, isLoading, searchCities, clearResults } = useCitySearch();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Very short debounce for instant feel (like Google)
    debounceRef.current = setTimeout(() => {
      if (newValue.length >= 1) {
        searchCities(newValue);
        setIsOpen(true);
      } else {
        clearResults();
        setIsOpen(false);
      }
    }, 50); // Ultra-fast response time
  };

  const handleSelect = (city: CitySearchResult) => {
    setInputValue(city.city);
    onChange(city);
    setIsOpen(false);
    clearResults();
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map((city, index) => (
            <button
              key={`${city.city}-${city.lat}-${index}`}
              onClick={() => handleSelect(city)}
              className="w-full px-3 py-2 text-left hover:bg-accent/50 flex items-center gap-2 transition-colors"
            >
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="overflow-hidden">
                <p className="font-medium truncate">{city.city}</p>
                <p className="text-xs text-muted-foreground truncate">{city.state || city.displayName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
