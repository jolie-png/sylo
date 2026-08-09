import { useState } from "react";
import { SEASONS, type AcademicTerm } from "@/lib/terms";
import { YEARS } from "@/lib/wayfind-data";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AcademicTermSelectorProps = {
  value: string;
  currentYear: string;
  onChange: (term: string) => void;
};

export function AcademicTermSelector({
  value,
  currentYear,
  onChange,
}: AcademicTermSelectorProps) {
  const currentIndex = YEARS.indexOf(currentYear);
  const startIdx = currentIndex >= 0 ? currentIndex : 0;

  // Current year + future years only
  const primaryYears = YEARS.slice(startIdx);

  const primaryTerms: AcademicTerm[] = primaryYears.flatMap((year) =>
    SEASONS.map((season) => ({
      value: `${season} ${year}`,
      label: `${season} ${year} Year`,
    }))
  );

  // Determine if the current value is a known term or a custom "other" value
  const knownValues = new Set(["", "__none__", "__other__", ...primaryTerms.map((t) => t.value)]);
  const isCustomValue = value !== "" && !knownValues.has(value);
  const [showCustom, setShowCustom] = useState(isCustomValue);

  // The select displays "__other__" when user is in custom mode
  const selectValue = showCustom ? "__other__" : value || undefined;

  function handleSelectChange(v: string) {
    if (v === "__none__") {
      setShowCustom(false);
      onChange("");
    } else if (v === "__other__") {
      setShowCustom(true);
      // Don't clear the value yet — let them type
      if (!isCustomValue) onChange("");
    } else {
      setShowCustom(false);
      onChange(v);
    }
  }

  return (
    <div className="space-y-2">
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger
          className="rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          aria-label="Select academic term"
        >
          <SelectValue placeholder="Select a term" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No term</SelectItem>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {currentYear} year & beyond
            </SelectLabel>
            {primaryTerms.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="__other__">Other (type your own)</SelectItem>
        </SelectContent>
      </Select>
      {showCustom ? (
        <input
          type="text"
          value={isCustomValue ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. January 2026, After graduation..."
          autoFocus
          className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
      ) : null}
    </div>
  );
}
