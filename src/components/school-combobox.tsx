import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isKnownUniversity, searchUniversities, UNIVERSITY_COUNT } from "@/lib/universities";
import { cn } from "@/lib/utils";

/**
 * Searchable school picker over the bundled university list.
 *
 * A school is too big a set for the tap-to-select pills Major and Year use, so
 * this replaces those for University only. The value is still a plain string:
 * whatever the student picks — or types, if their school isn't in the list —
 * lands in `profile.school` unchanged.
 */
export function SchoolCombobox({
  value,
  onChange,
  className,
  placeholder = "Search for your university",
  label = "University",
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchUniversities(query), [query]);
  const typed = query.trim();
  // Nobody is ever blocked from entering their real school: if the list has no
  // exact match for what they typed, the last row commits the raw text.
  const showFreeText = typed !== "" && !isKnownUniversity(typed);

  function commit(next: string) {
    onChange(next);
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          className={cn(
            "tap flex w-full items-center justify-between gap-2 rounded-2xl border bg-background px-4 py-3 text-left text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15",
            className,
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-0"
      >
        {/* Filtering is ours (capped, prefix-first), so cmdk's own filter stays off. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={`Search ${UNIVERSITY_COUNT.toLocaleString()} US universities`}
          />
          <CommandList>
            {results.map((name, i) => (
              // Names can repeat across systems, so the value has to be unique
              // or cmdk highlights every duplicate at once.
              <CommandItem
                key={`${name}|${i}`}
                value={`${name}|${i}`}
                onSelect={() => commit(name)}
                className="cursor-pointer"
              >
                <Check
                  className={cn("h-4 w-4 shrink-0", value === name ? "opacity-100" : "opacity-0")}
                />
                <span className="min-w-0 flex-1 truncate">{name}</span>
              </CommandItem>
            ))}


            {showFreeText ? (
              <CommandItem
                key="free-text"
                value="__free_text__"
                onSelect={() => commit(typed)}
                className="cursor-pointer"
              >
                <Check className="h-4 w-4 shrink-0 opacity-0" />
                <span className="min-w-0 flex-1 truncate">
                  Use &ldquo;<span className="font-medium text-foreground">{typed}</span>&rdquo; as
                  my school
                </span>
              </CommandItem>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
