import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface FilterAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
}

export function FilterAutocomplete({ value, onChange, options, placeholder = "Seleziona..." }: FilterAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value) || { value, label: value };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className="flex items-center w-full pl-3 pr-8 py-1.5 border border-slate-300 rounded-lg text-[10px] font-bold focus-within:ring-2 focus-within:ring-indigo-500 bg-white cursor-text shadow-sm"
        onClick={() => setIsOpen(true)}
      >
        <input
          type="text"
          className="w-full bg-transparent focus:outline-none text-slate-700"
          placeholder={placeholder}
          value={isOpen ? searchTerm : selectedOption.label}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm("");
          }}
        />
        
        {value && value !== "Tutti" && value !== "Nessuno" && (
          <button 
            type="button"
            className="absolute right-6 p-0.5 text-slate-400 hover:text-rose-500 transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              // Reset based on context, maybe default is "Tutti" or empty string depending on options
              const defaultOpt = options[0]?.value || "";
              onChange(defaultOpt);
              setIsOpen(false);
            }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">Nessun risultato</div>
          ) : (
            filteredOptions.map((opt, i) => (
              <div
                key={`${opt.value}-${i}`}
                className={`px-3 py-2 text-[10px] font-bold cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 ${value === opt.value ? 'bg-indigo-100 text-indigo-800' : 'text-slate-700'}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
