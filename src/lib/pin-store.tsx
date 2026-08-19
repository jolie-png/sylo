import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OpportunityDetails = {
  name: string;
  deadline: string;
  requirements: string[];
  description: string;
  category:
    | "Research"
    | "Internship"
    | "Fellowship"
    | "Club"
    | "Funding"
    | "Advising"
    | "Course";
  timeframe: string;
  contact: string;
};

export type PinItem = {
  /** Unique identifier (timestamp + random suffix). */
  id: string;
  /** Short AI-generated title summarizing the screenshot content. */
  title: string;
  /** Full OCR'd text extracted from the image. */
  extractedText: string;
  /** Open-ended topic label assigned by Claude (e.g. "Financial Aid", "Housing"). */
  topic: string;
  /** 2-4 descriptive tags. */
  tags: string[];
  /** Detected date from content in YYYY-MM-DD format, or undefined if none found. */
  detectedDate?: string;
  /** Whether the content represents a potential opportunity. */
  isOpportunityLike: boolean;
  /** Full opportunity details when isOpportunityLike is true. */
  opportunityDetails?: OpportunityDetails;
  /** ID of the roadmap custom step this item was linked to. */
  linkedStepId?: string;
  /** ISO timestamp of when this item was created. */
  createdAt: string;
  /** Compressed base64 thumbnail (canvas-resized, ~200px width, quality 0.6). */
  imageThumbnailBase64: string;
  /** URL where the student found this content (e.g. LinkedIn post, program page). */
  sourceUrl?: string;
};

/** @deprecated Use PinItem instead */
export type CatchItem = PinItem;

export type PinState = {
  items: PinItem[];
  hydrated: boolean;
  /** True when localStorage persistence has failed (quota exceeded). */
  storageFull: boolean;
  addItem: (item: PinItem) => void;
  updateItem: (
    id: string,
    patch: Partial<Omit<PinItem, "id" | "createdAt">>,
  ) => void;
  deleteItem: (id: string) => void;
  linkToRoadmap: (itemId: string, stepId: string) => void;
  dismissStorageWarning: () => void;
  seedItems: (items: PinItem[]) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "catch:state:v1";

/** Generate a unique ID without external dependencies. */
export function generatePinId(): string {
  return `pin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** @deprecated Use generatePinId instead */
export const generateCatchId = generatePinId;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const PinContext = createContext<PinState | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PinProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PinItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageFull, setStorageFull] = useState(false);

  // --- Hydrate from localStorage on mount ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          setItems(parsed.items);
        }
      }
    } catch {
      // Corrupted data — start with empty state
      console.warn("[Pin] Failed to hydrate from localStorage — starting fresh.");
    }
    setHydrated(true);
  }, []);

  // --- Listen for external writes to localStorage (e.g. from loadPersona demo seeding) ---
  useEffect(() => {
    function handleRefresh() {

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.items)) {
            setItems(parsed.items);
          }
        } else {
          setItems([]);
        }
      } catch {}
    }
    window.addEventListener("pin-store-updated", handleRefresh);
    return () => window.removeEventListener("pin-store-updated", handleRefresh);
  }, []);

  // --- Persist to localStorage when items change ---
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
      // If we successfully persisted after a previous failure, clear the flag
      if (storageFull) setStorageFull(false);
    } catch (err) {
      // localStorage is likely full
      console.warn("[Pin] localStorage write failed — items exist only in memory.", err);
      setStorageFull(true);
    }
  }, [items, hydrated]);

  // --- Methods ---

  const addItem = useCallback((item: PinItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<Omit<PinItem, "id" | "createdAt">>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const linkToRoadmap = useCallback((itemId: string, stepId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, linkedStepId: stepId } : item,
      ),
    );
  }, []);

  const seedItems = useCallback((newItems: PinItem[]) => {
    setItems(newItems);
  }, []);

  const dismissStorageWarning = useCallback(() => {
    setStorageFull(false);
  }, []);

  // --- Memoized value ---

  const value = useMemo<PinState>(
    () => ({
      items,
      hydrated,
      storageFull,
      addItem,
      updateItem,
      deleteItem,
      linkToRoadmap,
      dismissStorageWarning,
      seedItems,
    }),
    [items, hydrated, storageFull, addItem, updateItem, deleteItem, linkToRoadmap, dismissStorageWarning, seedItems],
  );

  return (
    <PinContext.Provider value={value}>
      {children}
      {storageFull && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-md dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          <span>Storage full — your pins won't persist after refresh.{" "}</span>
          <button
            onClick={dismissStorageWarning}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </PinContext.Provider>
  );
}

/** @deprecated Use PinProvider instead */
export const CatchProvider = PinProvider;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePin(): PinState {
  const ctx = useContext(PinContext);
  if (!ctx) {
    throw new Error("usePin must be used inside PinProvider");
  }
  return ctx;
}

/** @deprecated Use usePin instead */
export const useCatch = usePin;
