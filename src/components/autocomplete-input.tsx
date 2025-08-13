
"use client";

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getPlaceSuggestions } from '@/app/actions';

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  formFieldName: 'start' | 'end';
}

export function AutocompleteInput({ value, onChange, formFieldName, ...props }: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const fetchSuggestions = React.useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const result = await getPlaceSuggestions(query);
    setSuggestions(result);
    setLoading(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <div className="relative w-full" ref={containerRef}>
      <Input
        {...props}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        autoComplete="off"
      />
      {showSuggestions && (value.length > 1) && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg">
          {loading && <div className="p-2 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>}
          {!loading && suggestions.length > 0 && (
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="px-3 py-2 cursor-pointer hover:bg-accent"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
          {!loading && suggestions.length === 0 && value.length > 1 && (
             <div className="p-2 text-sm text-muted-foreground">No suggestions</div>
          )}
        </div>
      )}
    </div>
  );
}
