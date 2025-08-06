const STORAGE_KEYS = {
  INTERACTIONS: "web_interactions",
  SUMMARIES: "interaction_summaries",
  SETTINGS: "user_settings",
};

// Backend configuration
const BACKEND_CONFIG = {
  url: "http://localhost:5000/api/analyze",
  enabled: true,
  timeout: 5000,
};

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
    this.pendingAnalysis = new Map();
  }

  setupListeners() {
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

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Always respond to prevent message channel closed error
      try {
        if (message.type === "user_interaction") {
          // Process the interaction
          this.recordInteraction(message.action, {
            ...message.data,
            url: sender.tab?.url,
            timestamp: Date.now(),
            tabId: sender.tab?.id,
          });

          // Send meaningful interactions to backend for AI analysis
          if (this.shouldAnalyze(message.action)) {
            this.sendToBackend(message.action, {
              ...message.data,
              url: sender.tab?.url,
              timestamp: Date.now(),
              tabId: sender.tab?.id,
            });
          }

          // Send immediate response to prevent the error
          sendResponse({ success: true, timestamp: Date.now() });
        } else {
          // Unknown message type
          sendResponse({ success: false, error: "Unknown message type" });
        }
      } catch (error) {
        console.error("Error processing message:", error);
        sendResponse({ success: false, error: error.message });
      }
    });
  }

  shouldAnalyze(actionType) {
    // Only send meaningful interactions to backend
    const meaningfulActions = [
      "reading_session",
      "page_session",
      "meaningful_click",
      "content_selection",
    ];
    return meaningfulActions.includes(actionType);
  }

  async sendToBackend(action, data) {
    if (!BACKEND_CONFIG.enabled) return;

    try {
      const payload = {
        action,
        ...data,
        extensionVersion: "1.0.0",
        timestamp: Date.now(),
      };

      const response = await fetch(BACKEND_CONFIG.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(BACKEND_CONFIG.timeout),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Backend analysis:", result);

        // Store AI insights locally
        if (result.content_analysis || result.behavior_analysis) {
          this.storeAIInsights(result);
        }
      } else {
        console.warn("Backend analysis failed:", response.status);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn("Backend request timeout");
      } else {
        console.error("Backend communication error:", error);
      }
    }
  }

  async storeAIInsights(insights) {
    try {
      const stored = await chrome.storage.local.get("ai_insights");
      const existingInsights = stored.ai_insights || [];

      existingInsights.push({
        ...insights,
        timestamp: Date.now(),
        id: this.generateId(),
      });

      // Keep only last 100 insights
      if (existingInsights.length > 100) {
        existingInsights.splice(0, existingInsights.length - 100);
      }

      await chrome.storage.local.set({
        ai_insights: existingInsights,
      });
    } catch (error) {
      console.error("Error storing AI insights:", error);
    }
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

new InteractionTracker();

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("MindCache extension installed/updated:", details.reason);

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
