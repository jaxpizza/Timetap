"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectPremiumOption {
  value: string;
  label: string;
}

interface SelectPremiumProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectPremiumOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function SelectPremium({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  disabled,
}: SelectPremiumProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <Select value={value} onValueChange={(v) => { if (v !== null) onValueChange(v); }} disabled={disabled}>
      <SelectTrigger
        className="h-11 w-full rounded-[8px] px-4 text-sm transition-all duration-200 focus:ring-2 focus:ring-timetap-primary-500/20 data-[size=default]:h-11"
        style={{
          backgroundColor: "var(--tt-elevated-bg)",
          borderColor: "var(--tt-border)",
          color: "var(--tt-text-primary)",
        }}
      >
        <SelectValue placeholder={placeholder}>
          {selectedLabel ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="rounded-[10px] shadow-xl shadow-black/20"
        style={{
          backgroundColor: "var(--tt-dropdown-bg)",
          borderColor: "var(--tt-border)",
        }}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-md px-3 py-2 transition-colors duration-200"
            style={{ color: "var(--tt-text-secondary)" }}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
