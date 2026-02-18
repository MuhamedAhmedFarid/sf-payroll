
import React, { useState, useEffect } from 'react';

interface TimeInputProps {
  label: string;
  value: string; // HH:MM:SS format
  onChange: (value: string) => void; // sends back HH:MM:SS format
  required?: boolean;
}

const TimeInput: React.FC<TimeInputProps> = ({ label, value, onChange, required = false }) => {
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hours: '', minutes: '', seconds: '' };
    const parts = timeStr.split(':');
    return {
      hours: parts[0] === '00' ? '' : parts[0] || '',
      minutes: parts[1] === '00' ? '' : parts[1] || '',
      seconds: parts[2] === '00' ? '' : parts[2] || '',
    };
  };

  const [time, setTime] = useState(parseTime(value));

  useEffect(() => {
    // This syncs the component if the value is changed from outside (e.g., loading an existing record)
    setTime(parseTime(value));
  }, [value]);

  const handleInputChange = (part: 'hours' | 'minutes' | 'seconds', val: string) => {
    const numericValue = parseInt(val, 10);
    let updatedValue = isNaN(numericValue) ? '' : String(numericValue);

    // Basic validation to keep numbers in a sensible range
    if (part === 'minutes' || part === 'seconds') {
      if (numericValue > 59) updatedValue = '59';
      if (numericValue < 0) updatedValue = '0';
    }
    if (part === 'hours' && numericValue < 0) {
        updatedValue = '0';
    }

    const newTime = { ...time, [part]: updatedValue };
    setTime(newTime);
    
    // Construct the HH:MM:SS string on every change and pass it up
    const h = String(newTime.hours || 0).padStart(2, '0');
    const m = String(newTime.minutes || 0).padStart(2, '0');
    const s = String(newTime.seconds || 0).padStart(2, '0');
    onChange(`${h}:${m}:${s}`);
  };
  
  return (
    <div>
      <label className="block mb-1 text-sm font-semibold text-content-200">{label}</label>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <input
          type="number"
          placeholder="H"
          aria-label="Hours"
          value={time.hours}
          onChange={(e) => handleInputChange('hours', e.target.value)}
          min="0"
          className="w-full px-2 py-2 text-center bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
          required={required && !time.hours && !time.minutes && !time.seconds}
        />
        <span className="font-bold text-content-300">:</span>
        <input
          type="number"
          placeholder="M"
          aria-label="Minutes"
          value={time.minutes}
          onChange={(e) => handleInputChange('minutes', e.target.value)}
          max="59"
          min="0"
          className="w-full px-2 py-2 text-center bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
        />
        <span className="font-bold text-content-300">:</span>
        <input
          type="number"
          placeholder="S"
          aria-label="Seconds"
          value={time.seconds}
          onChange={(e) => handleInputChange('seconds', e.target.value)}
          max="59"
          min="0"          
          className="w-full px-2 py-2 text-center bg-base-200 border border-base-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>
    </div>
  );
};

export default TimeInput;