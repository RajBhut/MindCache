import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

// Browser API compatibility
const getBrowserAPI = () => {
  if (typeof chrome !== "undefined") return chrome;
  return null;
};

const useStore = create((set, get) => ({
  // State
  interactions: [],
  summaries: [],
  highlights: [],
  notes: [],
  quotes: [],
  settings: {
    trackingEnabled: true,
    dataRetentionDays: 30,
    summarizeFrequency: 10, // every 10 interactions
  },
  loading: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Load data from extension storage
  loadData: async () => {
    const browserAPI = getBrowserAPI();
    if (!browserAPI || !browserAPI.storage || !browserAPI.storage.local) {
      set({ error: "Browser extension storage not available" });
      return;
    }

    try {
      set({ loading: true, error: null });

      const result = await Promise.race([
        browserAPI.storage.local.get([
          "web_interactions",
          "interaction_summaries",
          "user_settings",
          "mindcache-highlights",
          "mindcache-notes",
          "mindcache-quotes",
        ]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Storage access timeout")), 10000)
        ),
      ]);

      set({
        interactions: result.web_interactions || [],
        summaries: result.interaction_summaries || [],
        highlights: result["mindcache-highlights"] || [],
        notes: result["mindcache-notes"] || [],
        quotes: result["mindcache-quotes"] || [],
        settings: { ...get().settings, ...(result.user_settings || {}) },
        loading: false,
      });
    } catch (error) {
      console.error("Storage load error:", error);
      set({ error: `Failed to load data: ${error.message}`, loading: false });
    }
  },

  // Save settings
  saveSettings: async (newSettings) => {
    const browserAPI = getBrowserAPI();
    if (!browserAPI) return;

    try {
      const settings = { ...get().settings, ...newSettings };
      await browserAPI.storage.local.set({ user_settings: settings });
      set({ settings });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Clear all data
  clearData: async () => {
    const browserAPI = getBrowserAPI();
    if (!browserAPI) return;

    try {
      await browserAPI.storage.local.clear();
      set({ interactions: [], summaries: [], error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Get filtered interactions
  getFilteredInteractions: (filters = {}) => {
    const { interactions } = get();
    let filtered = [...interactions];

    if (filters.startDate) {
      filtered = filtered.filter((i) => i.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter((i) => i.timestamp <= filters.endDate);
    }

    if (filters.type) {
      filtered = filtered.filter((i) => i.type === filters.type);
    }

    if (filters.domain) {
      filtered = filtered.filter((i) => {
        try {
          const url = new URL(i.data.url);
          return url.hostname.includes(filters.domain);
        } catch {
          return false;
        }
      });
    }

    return filtered;
  },

  // Get interaction statistics
  getStats: () => {
    const { interactions, summaries, highlights, notes, quotes } = get();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const todayInteractions = interactions.filter(
      (i) => i.timestamp >= todayTimestamp
    );

    // Today's mindcache activity
    const todayHighlights = highlights.filter(
      (h) => new Date(h.timestamp) >= today
    );
    const todayNotes = notes.filter((n) => new Date(n.timestamp) >= today);
    const todayQuotes = quotes.filter((q) => new Date(q.timestamp) >= today);

    // Get top domains (including mindcache data)
    const domainCount = {};
    interactions.forEach((interaction) => {
      if (interaction.data.url) {
        try {
          const domain = new URL(interaction.data.url).hostname;
          domainCount[domain] = (domainCount[domain] || 0) + 1;
        } catch (e) {}
      }
    });

    // Add mindcache domains
    highlights.forEach((highlight) => {
      const domain = highlight.domain;
      if (domain) {
        domainCount[domain] = (domainCount[domain] || 0) + 1;
      }
    });

    notes.forEach((note) => {
      const domain = note.domain;
      if (domain) {
        domainCount[domain] = (domainCount[domain] || 0) + 1;
      }
    });

    quotes.forEach((quote) => {
      const domain = quote.domain;
      if (domain) {
        domainCount[domain] = (domainCount[domain] || 0) + 1;
      }
    });

    const topDomains = Object.entries(domainCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    // Get interaction types
    const typeCount = {};
    interactions.forEach((interaction) => {
      typeCount[interaction.type] = (typeCount[interaction.type] || 0) + 1;
    });

    // Add mindcache activity types
    typeCount["highlights"] = highlights.length;
    typeCount["notes"] = notes.length;
    typeCount["quotes"] = quotes.length;

    return {
      totalInteractions: interactions.length,
      todayInteractions: todayInteractions.length,
      totalSummaries: summaries.length,
      totalHighlights: highlights.length,
      totalNotes: notes.length,
      totalQuotes: quotes.length,
      todayHighlights: todayHighlights.length,
      todayNotes: todayNotes.length,
      todayQuotes: todayQuotes.length,
      topDomains,
      interactionTypes: typeCount,
      lastUpdated: interactions[interactions.length - 1]?.timestamp || null,
    };
  },

  // Export data
  exportData: () => {
    const { interactions, summaries, settings } = get();
    return {
      interactions,
      summaries,
      settings,
      exportedAt: Date.now(),
      version: "1.0.0",
    };
  },

  importData: async (data) => {
    const browserAPI = getBrowserAPI();
    if (!browserAPI) return;

    try {
      set({ loading: true });

      await browserAPI.storage.local.set({
        web_interactions: data.interactions || [],
        interaction_summaries: data.summaries || [],
        user_settings: data.settings || {},
      });

      set({
        interactions: data.interactions || [],
        summaries: data.summaries || [],
        settings: { ...get().settings, ...(data.settings || {}) },
        loading: false,
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));

export default useStore;
