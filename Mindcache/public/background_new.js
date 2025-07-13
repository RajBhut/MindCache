// Background script for MindCache extension
// Using Chrome APIs directly (no imports allowed in service workers)

// Storage keys
const STORAGE_KEYS = {
  INTERACTIONS: "web_interactions",
  SUMMARIES: "interaction_summaries",
  SETTINGS: "user_settings",
};

// Check if chrome APIs are available
const isExtensionContext = () => {
  return (
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local
  );
};

class InteractionTracker {
  constructor() {
    if (!isExtensionContext()) {
      console.error("Extension context not available");
      return;
    }
    this.setupListeners();
  }

  setupListeners() {
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url) {
        this.recordInteraction("page_visit", {
          url: tab.url,
          title: tab.title,
          timestamp: Date.now(),
          tabId: tabId,
        });
      }
    });

    // Listen for tab switches
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url) {
          this.recordInteraction("tab_switch", {
            url: tab.url,
            title: tab.title,
            timestamp: Date.now(),
            tabId: activeInfo.tabId,
          });
        }
      } catch (error) {
        console.error("Error getting tab info:", error);
      }
    });

    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "user_interaction") {
        this.recordInteraction(message.action, {
          ...message.data,
          url: sender.tab?.url,
          timestamp: Date.now(),
          tabId: sender.tab?.id,
        });
      }
      return true;
    });
  }

  async recordInteraction(type, data) {
    if (!isExtensionContext()) {
      console.error("Extension context not available for storage");
      return;
    }

    try {
      // Use a timeout to prevent hanging storage calls
      const stored = await Promise.race([
        chrome.storage.local.get(STORAGE_KEYS.INTERACTIONS),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Storage timeout")), 5000)
        ),
      ]);

      const interactions = stored[STORAGE_KEYS.INTERACTIONS] || [];

      const interaction = {
        id: this.generateId(),
        type,
        data,
        timestamp: Date.now(),
      };

      interactions.push(interaction);

      // Keep only last 1000 interactions to prevent storage overflow
      if (interactions.length > 1000) {
        interactions.splice(0, interactions.length - 1000);
      }

      await Promise.race([
        chrome.storage.local.set({
          [STORAGE_KEYS.INTERACTIONS]: interactions,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Storage set timeout")), 5000)
        ),
      ]);

      // Generate summary for recent interactions
      if (interactions.length % 10 === 0) {
        this.generateSummary(interactions.slice(-10));
      }
    } catch (error) {
      console.error("Error recording interaction:", error);
    }
  }

  async generateSummary(recentInteractions) {
    try {
      const summary = {
        id: this.generateId(),
        timestamp: Date.now(),
        timeRange: {
          start: recentInteractions[0]?.timestamp,
          end: recentInteractions[recentInteractions.length - 1]?.timestamp,
        },
        interactions: recentInteractions.length,
        topSites: this.getTopSites(recentInteractions),
        activityPattern: this.analyzeActivity(recentInteractions),
      };

      const stored = await chrome.storage.local.get(STORAGE_KEYS.SUMMARIES);
      const summaries = stored[STORAGE_KEYS.SUMMARIES] || [];
      summaries.push(summary);

      // Keep only last 100 summaries
      if (summaries.length > 100) {
        summaries.splice(0, summaries.length - 100);
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.SUMMARIES]: summaries,
      });
    } catch (error) {
      console.error("Error generating summary:", error);
    }
  }

  getTopSites(interactions) {
    const siteCount = {};
    interactions.forEach((interaction) => {
      if (interaction.data.url) {
        try {
          const domain = new URL(interaction.data.url).hostname;
          siteCount[domain] = (siteCount[domain] || 0) + 1;
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });

    return Object.entries(siteCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));
  }

  analyzeActivity(interactions) {
    const types = {};
    interactions.forEach((interaction) => {
      types[interaction.type] = (types[interaction.type] || 0) + 1;
    });

    return {
      mostCommonActivity: Object.entries(types).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0],
      activityTypes: types,
    };
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Initialize the tracker
new InteractionTracker();

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("MindCache extension installed/updated:", details.reason);

  // Initialize default settings if this is a fresh install
  if (details.reason === "install") {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: {
          trackingEnabled: true,
          dataRetentionDays: 30,
          summarizeFrequency: 10,
        },
      });
      console.log("Default settings initialized");
    } catch (error) {
      console.error("Failed to initialize settings:", error);
    }
  }
});

console.log("MindCache background script loaded");
