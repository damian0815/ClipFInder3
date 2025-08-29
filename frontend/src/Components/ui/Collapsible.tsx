import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ trigger, children, defaultOpen = false, className }, ref) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div ref={ref} className={cn("border border-slate-200 rounded-lg overflow-hidden", className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left text-sm font-medium text-slate-900"
        >
          <span>{trigger}</span>
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "transform rotate-180"
            )}
          />
        </button>
        {isOpen && (
          <div className="p-4 bg-white border-t border-slate-200">
            {children}
          </div>
        )}
      </div>
    );
  }
);
Collapsible.displayName = "Collapsible";

export { Collapsible };
