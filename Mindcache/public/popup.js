// Popup functionality for MindCache extension
class MindCachePopup {
  constructor() {
    this.currentDomain = "";
    this.allData = {
      highlights: [],
      notes: [],
      quotes: [],
    };
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.updateCurrentDomain();
    this.switchTab("overview");
    this.updateStats();
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get([
        "mindcache-highlights",
        "mindcache-notes",
        "mindcache-quotes",
      ]);
      this.allData.highlights = result["mindcache-highlights"] || [];
      this.allData.notes = result["mindcache-notes"] || [];
      this.allData.quotes = result["mindcache-quotes"] || [];
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  async updateCurrentDomain() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab && tab.url) {
        const url = new URL(tab.url);
        this.currentDomain = url.hostname;
        document.getElementById("currentDomain").textContent =
          this.currentDomain;
      }
    } catch (error) {
      console.error("Error getting current domain:", error);
      document.getElementById("currentDomain").textContent = "Unknown site";
    }
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Action buttons
    document
      .getElementById("exportAllBtn")
      .addEventListener("click", () => this.exportAllData());
    document
      .getElementById("clearAllBtn")
      .addEventListener("click", () => this.clearAllData());
    document
      .getElementById("settingsBtn")
      .addEventListener("click", () => this.openSettings());

    document
      .getElementById("clearHighlightsBtn")
      .addEventListener("click", () => this.clearData("highlights"));
    document
      .getElementById("exportHighlightsBtn")
      .addEventListener("click", () => this.exportData("highlights"));

    document
      .getElementById("clearNotesBtn")
      .addEventListener("click", () => this.clearData("notes"));
    document
      .getElementById("exportNotesBtn")
      .addEventListener("click", () => this.exportData("notes"));

    document
      .getElementById("clearQuotesBtn")
      .addEventListener("click", () => this.clearData("quotes"));
    document
      .getElementById("exportQuotesBtn")
      .addEventListener("click", () => this.exportData("quotes"));
  }

  switchTab(tabName) {
    // Update tab appearance
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    // Update tab content
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.remove("active");
    });
    document.getElementById(tabName).classList.add("active");

    // Load tab content
    if (tabName === "highlights") this.loadHighlights();
    else if (tabName === "notes") this.loadNotes();
    else if (tabName === "quotes") this.loadQuotes();
    else if (tabName === "overview") this.updateStats();
  }

  updateStats() {
    const currentSiteData = this.getDataForCurrentSite();
    const allSites = new Set([
      ...this.allData.highlights.map((h) => h.domain),
      ...this.allData.notes.map((n) => n.domain),
      ...this.allData.quotes.map((q) => q.domain),
    ]);

    document.getElementById("highlightCount").textContent =
      currentSiteData.highlights.length;
    document.getElementById("noteCount").textContent =
      currentSiteData.notes.length;
    document.getElementById("quoteCount").textContent =
      currentSiteData.quotes.length;
    document.getElementById("totalSites").textContent = allSites.size;
  }

  getDataForCurrentSite() {
    return {
      highlights: this.allData.highlights.filter(
        (h) => h.domain === this.currentDomain
      ),
      notes: this.allData.notes.filter((n) => n.domain === this.currentDomain),
      quotes: this.allData.quotes.filter(
        (q) => q.domain === this.currentDomain
      ),
    };
  }

  loadHighlights() {
    const container = document.getElementById("highlightsList");
    const currentSiteData = this.getDataForCurrentSite();
    const highlights = currentSiteData.highlights;

    if (highlights.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🖍️</div>
                    <div>No highlights on this site</div>
                    <div style="font-size: 10px; margin-top: 4px;">Select text on this webpage to create highlights</div>
                </div>
            `;
      return;
    }

    container.innerHTML = highlights
      .map(
        (highlight) => `
            <div class="item">
                <div class="item-text">"${this.truncateText(
                  highlight.text,
                  100
                )}"</div>
                <div class="item-meta">
                    <span>${this.formatDate(highlight.timestamp)}</span>
                    <div class="item-actions">
                        <button class="btn-small btn-copy" onclick="popup.copyToClipboard('${this.escapeHtml(
                          highlight.text
                        )}')">Copy</button>
                        <button class="btn-small btn-delete" onclick="popup.deleteItem('highlights', '${
                          highlight.id
                        }')">Delete</button>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }

  loadNotes() {
    const container = document.getElementById("notesList");
    const currentSiteData = this.getDataForCurrentSite();
    const notes = currentSiteData.notes;

    if (notes.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💭</div>
                    <div>No notes on this site</div>
                    <div style="font-size: 10px; margin-top: 4px;">Select text and add notes to save your thoughts</div>
                </div>
            `;
      return;
    }

    container.innerHTML = notes
      .map(
        (note) => `
            <div class="item">
                <div class="item-text"><strong>Note:</strong> ${this.truncateText(
                  note.noteText,
                  80
                )}</div>
                <div class="item-text" style="font-style: italic; color: #718096;">"${this.truncateText(
                  note.selectedText,
                  60
                )}"</div>
                <div class="item-meta">
                    <span>${this.formatDate(note.timestamp)}</span>
                    <div class="item-actions">
                        <button class="btn-small btn-copy" onclick="popup.copyToClipboard('${this.escapeHtml(
                          note.noteText
                        )}')">Copy</button>
                        <button class="btn-small btn-delete" onclick="popup.deleteItem('notes', '${
                          note.id
                        }')">Delete</button>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }

  loadQuotes() {
    const container = document.getElementById("quotesList");
    const currentSiteData = this.getDataForCurrentSite();
    const quotes = currentSiteData.quotes;

    if (quotes.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💾</div>
                    <div>No quotes on this site</div>
                    <div style="font-size: 10px; margin-top: 4px;">Save important quotes from this webpage</div>
                </div>
            `;
      return;
    }

    container.innerHTML = quotes
      .map(
        (quote) => `
            <div class="item">
                <div class="item-text">"${this.truncateText(
                  quote.text,
                  100
                )}"</div>
                <div class="item-meta">
                    <span>${this.formatDate(quote.timestamp)}</span>
                    <div class="item-actions">
                        <button class="btn-small btn-copy" onclick="popup.copyToClipboard('${this.escapeHtml(
                          quote.text
                        )}')">Copy</button>
                        <button class="btn-small btn-delete" onclick="popup.deleteItem('quotes', '${
                          quote.id
                        }')">Delete</button>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }

  async deleteItem(type, id) {
    if (!confirm(`Delete this ${type.slice(0, -1)}?`)) return;

    try {
      this.allData[type] = this.allData[type].filter((item) => item.id !== id);
      await chrome.storage.local.set({
        [`mindcache-${type}`]: this.allData[type],
      });

      // Refresh current view
      if (type === "highlights") this.loadHighlights();
      else if (type === "notes") this.loadNotes();
      else if (type === "quotes") this.loadQuotes();

      this.updateStats();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  }

  async clearData(type) {
    const currentSiteData = this.getDataForCurrentSite();
    const count = currentSiteData[type].length;

    if (count === 0) return;

    if (!confirm(`Clear all ${count} ${type} from ${this.currentDomain}?`))
      return;

    try {
      this.allData[type] = this.allData[type].filter(
        (item) => item.domain !== this.currentDomain
      );
      await chrome.storage.local.set({
        [`mindcache-${type}`]: this.allData[type],
      });

      // Refresh current view
      if (type === "highlights") this.loadHighlights();
      else if (type === "notes") this.loadNotes();
      else if (type === "quotes") this.loadQuotes();

      this.updateStats();
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  }

  async clearAllData() {
    if (!confirm("Clear ALL MindCache data? This cannot be undone!")) return;

    try {
      await chrome.storage.local.clear();
      this.allData = { highlights: [], notes: [], quotes: [] };

      // Refresh all views
      this.loadHighlights();
      this.loadNotes();
      this.loadQuotes();
      this.updateStats();
    } catch (error) {
      console.error("Error clearing all data:", error);
    }
  }

  exportData(type) {
    const currentSiteData = this.getDataForCurrentSite();
    const data = currentSiteData[type];

    if (data.length === 0) {
      alert(`No ${type} to export from ${this.currentDomain}`);
      return;
    }

    const exportData = {
      domain: this.currentDomain,
      type: type,
      count: data.length,
      timestamp: new Date().toISOString(),
      data: data,
    };

    this.downloadJSON(
      exportData,
      `mindcache-${type}-${this.currentDomain}-${
        new Date().toISOString().split("T")[0]
      }.json`
    );
  }

  exportAllData() {
    const exportData = {
      domain: this.currentDomain,
      timestamp: new Date().toISOString(),
      highlights: this.getDataForCurrentSite().highlights,
      notes: this.getDataForCurrentSite().notes,
      quotes: this.getDataForCurrentSite().quotes,
      totalCount:
        this.getDataForCurrentSite().highlights.length +
        this.getDataForCurrentSite().notes.length +
        this.getDataForCurrentSite().quotes.length,
    };

    this.downloadJSON(
      exportData,
      `mindcache-all-${this.currentDomain}-${
        new Date().toISOString().split("T")[0]
      }.json`
    );
  }

  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Visual feedback
        const originalText = event.target.textContent;
        event.target.textContent = "✓ Copied";
        event.target.style.background = "#48bb78";
        event.target.style.color = "white";

        setTimeout(() => {
          event.target.textContent = originalText;
          event.target.style.background = "";
          event.target.style.color = "";
        }, 1000);
      })
      .catch((err) => {
        console.error("Failed to copy text:", err);
      });
  }

  openSettings() {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  escapeHtml(text) {
    return text.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }
}

// Initialize popup when DOM is loaded
let popup;
document.addEventListener("DOMContentLoaded", () => {
  popup = new MindCachePopup();
});

// Listen for storage changes to update the popup in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && popup) {
    popup.loadData().then(() => {
      popup.updateStats();
      // Refresh current tab content
      const activeTab = document.querySelector(".tab.active").dataset.tab;
      if (activeTab === "highlights") popup.loadHighlights();
      else if (activeTab === "notes") popup.loadNotes();
      else if (activeTab === "quotes") popup.loadQuotes();
    });
  }
});
