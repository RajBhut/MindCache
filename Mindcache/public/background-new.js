// MindCache Background Service Worker
class MindCacheBackground {
  constructor() {
    this.setupListeners();
  }

  setupListeners() {
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle installation
    chrome.runtime.onInstalled.addListener(() => {
      this.onInstalled();
    });

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url) {
        this.updateTabData(tabId, tab);
      }
    });

    // Handle tab activation
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        this.updateActiveTab(tab);
      } catch (error) {
        console.error("Error getting active tab:", error);
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case "updateCounts":
          await this.updateBadge(message.data);
          sendResponse({ success: true });
          break;

        case "getCounts":
          const counts = await this.getCounts(message.domain);
          sendResponse({ success: true, data: counts });
          break;

        case "exportData":
          const exportData = await this.exportData(message.domain);
          sendResponse({ success: true, data: exportData });
          break;

        case "clearData":
          await this.clearData(message.dataType, message.domain);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async onInstalled() {
    console.log("MindCache extension installed");

    // Set default settings
    const defaultSettings = {
      autoHighlight: true,
      syncEnabled: true,
      notifications: true,
      focusModeEnabled: true,
      theme: "default",
    };

    await chrome.storage.local.set({ "mindcache-settings": defaultSettings });

    // Initialize storage if empty
    const existingData = await chrome.storage.local.get([
      "mindcache-highlights",
      "mindcache-notes",
      "mindcache-quotes",
    ]);

    if (!existingData["mindcache-highlights"]) {
      await chrome.storage.local.set({ "mindcache-highlights": [] });
    }
    if (!existingData["mindcache-notes"]) {
      await chrome.storage.local.set({ "mindcache-notes": [] });
    }
    if (!existingData["mindcache-quotes"]) {
      await chrome.storage.local.set({ "mindcache-quotes": [] });
    }
  }

  async updateBadge(data) {
    try {
      const totalActivity = data.totalActivity || 0;

      if (totalActivity > 0) {
        await chrome.action.setBadgeText({
          text: totalActivity > 99 ? "99+" : totalActivity.toString(),
        });
        await chrome.action.setBadgeBackgroundColor({ color: "#667eea" });
      } else {
        await chrome.action.setBadgeText({ text: "" });
      }

      // Update title with current domain info
      await chrome.action.setTitle({
        title: `MindCache - ${data.domain}\n${data.highlightCount} highlights, ${data.noteCount} notes, ${data.quoteCount} quotes`,
      });
    } catch (error) {
      console.error("Error updating badge:", error);
    }
  }

  async getCounts(domain) {
    try {
      const data = await chrome.storage.local.get([
        "mindcache-highlights",
        "mindcache-notes",
        "mindcache-quotes",
      ]);

      const highlights = data["mindcache-highlights"] || [];
      const notes = data["mindcache-notes"] || [];
      const quotes = data["mindcache-quotes"] || [];

      if (domain) {
        return {
          highlights: highlights.filter((h) => h.domain === domain).length,
          notes: notes.filter((n) => n.domain === domain).length,
          quotes: quotes.filter((q) => q.domain === domain).length,
          total:
            highlights.filter((h) => h.domain === domain).length +
            notes.filter((n) => n.domain === domain).length +
            quotes.filter((q) => q.domain === domain).length,
        };
      } else {
        return {
          highlights: highlights.length,
          notes: notes.length,
          quotes: quotes.length,
          total: highlights.length + notes.length + quotes.length,
        };
      }
    } catch (error) {
      console.error("Error getting counts:", error);
      return { highlights: 0, notes: 0, quotes: 0, total: 0 };
    }
  }

  async exportData(domain = null) {
    try {
      const data = await chrome.storage.local.get([
        "mindcache-highlights",
        "mindcache-notes",
        "mindcache-quotes",
      ]);

      let highlights = data["mindcache-highlights"] || [];
      let notes = data["mindcache-notes"] || [];
      let quotes = data["mindcache-quotes"] || [];

      if (domain) {
        highlights = highlights.filter((h) => h.domain === domain);
        notes = notes.filter((n) => n.domain === domain);
        quotes = quotes.filter((q) => q.domain === domain);
      }

      return {
        domain: domain || "all",
        timestamp: new Date().toISOString(),
        highlights,
        notes,
        quotes,
        totalItems: highlights.length + notes.length + quotes.length,
      };
    } catch (error) {
      console.error("Error exporting data:", error);
      throw error;
    }
  }

  async clearData(dataType, domain = null) {
    try {
      const storageKey = `mindcache-${dataType}`;
      const result = await chrome.storage.local.get([storageKey]);
      let data = result[storageKey] || [];

      if (domain) {
        data = data.filter((item) => item.domain !== domain);
      } else {
        data = [];
      }

      await chrome.storage.local.set({ [storageKey]: data });
      return true;
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  }

  async updateTabData(tabId, tab) {
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://")
    ) {
      return;
    }

    try {
      const domain = new URL(tab.url).hostname;
      const counts = await this.getCounts(domain);

      if (counts.total > 0) {
        await this.updateBadge({
          domain,
          highlightCount: counts.highlights,
          noteCount: counts.notes,
          quoteCount: counts.quotes,
          totalActivity: counts.total,
        });
      } else {
        await chrome.action.setBadgeText({ text: "" });
        await chrome.action.setTitle({ title: "MindCache" });
      }
    } catch (error) {
      console.error("Error updating tab data:", error);
    }
  }

  async updateActiveTab(tab) {
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://")
    ) {
      await chrome.action.setBadgeText({ text: "" });
      await chrome.action.setTitle({ title: "MindCache" });
      return;
    }

    await this.updateTabData(tab.id, tab);
  }
}

// Initialize background service
if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onInstalled
) {
  new MindCacheBackground();
  console.log("MindCache background service worker initialized");
} else {
  console.error("Chrome extension APIs not available");
}
