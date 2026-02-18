
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, UserIcon, UsersIcon } from './icons';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const displayValue = () => {
    if (selected.length === 0) {
      return placeholder;
    }
    if (selected.length === 1) {
        const selectedOption = options.find(opt => opt.value === selected[0]);
        return selectedOption ? selectedOption.label : '1 selected';
    }
    if (selected.length === options.length) {
        return "All Employees";
    }
    return `${selected.length} employees selected`;
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full px-3 py-2 text-left bg-base-200 border border-base-300 rounded-md cursor-default focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
      >
        <span className="flex items-center">
          {selected.length > 1 ? <UsersIcon className="w-5 h-5 mr-2 text-content-300"/> : <UserIcon className="w-5 h-5 mr-2 text-content-300"/>}
          <span className="block truncate">{displayValue()}</span>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon className={`w-5 h-5 text-content-300 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <ul className="py-1">
            {options.map((option) => (
              <li
                key={option.value}
                className="px-3 py-2 text-content-200 cursor-pointer hover:bg-base-200"
                onClick={() => handleSelect(option.value)}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => {}} // The onClick on li handles the logic
                    className="w-4 h-4 text-accent bg-base-300 border-base-300 rounded focus:ring-accent"
                  />
                  <span className="ml-3 block truncate">{option.label}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;