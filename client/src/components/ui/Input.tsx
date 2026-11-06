import { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  startIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, startIcon, type = 'text', required, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
            {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 
              ${startIcon ? 'pl-10' : ''} 
              ${isPassword ? 'pr-10' : ''}
              ${error ? 'border-red-300 focus:ring-danger focus:border-danger' : 'border-gray-300 focus:ring-primary focus:border-primary'}
              disabled:bg-gray-50 disabled:text-gray-500 placeholder:text-gray-400 ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && (
          <span id={errorId} className="text-xs text-danger flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';