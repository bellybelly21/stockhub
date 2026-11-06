import { forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import * as React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, required, id, ...props }, ref) => {
    const selectId = id || React.useId();
    
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-sm font-semibold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none bg-white border rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 
              ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary'} 
              ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {error && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';