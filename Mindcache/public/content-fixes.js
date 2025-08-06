// Content script fixes and improvements
(() => {
  "use strict";

  // Data Sync Manager for real-time updates
  class DataSyncManager {
    static updateExtensionCounts() {
      const highlights = JSON.parse(
        localStorage.getItem("mindcache-highlights") || "[]"
      );
      const notes = JSON.parse(localStorage.getItem("mindcache-notes") || "[]");
      const quotes = JSON.parse(
        localStorage.getItem("mindcache-quotes") || "[]"
      );

      const domain = window.location.hostname;
      const domainHighlights = highlights.filter((h) => h.domain === domain);
      const domainNotes = notes.filter((n) => n.domain === domain);
      const domainQuotes = quotes.filter((q) => q.domain === domain);

      const data = {
        domain: domain,
        highlightCount: domainHighlights.length,
        noteCount: domainNotes.length,
        quoteCount: domainQuotes.length,
        totalActivity:
          domainHighlights.length + domainNotes.length + domainQuotes.length,
      };

      // Store in chrome storage and send message to extension
      chrome.storage.local.set({ [`siteData_${domain}`]: data });
      chrome.runtime.sendMessage({ type: "updateCounts", data: data });
    }

    static notifyHighlightAdded(highlightData) {
      const highlights = JSON.parse(
        localStorage.getItem("mindcache-highlights") || "[]"
      );
      highlights.push(highlightData);
      localStorage.setItem("mindcache-highlights", JSON.stringify(highlights));
      chrome.storage.local.set({ "mindcache-highlights": highlights });
      this.updateExtensionCounts();
    }

    static notifyNoteAdded(noteData) {
      const notes = JSON.parse(localStorage.getItem("mindcache-notes") || "[]");
      notes.push(noteData);
      localStorage.setItem("mindcache-notes", JSON.stringify(notes));
      chrome.storage.local.set({ "mindcache-notes": notes });
      this.updateExtensionCounts();
    }

    static notifyQuoteSaved(quoteData) {
      const quotes = JSON.parse(
        localStorage.getItem("mindcache-quotes") || "[]"
      );
      quotes.push(quoteData);
      localStorage.setItem("mindcache-quotes", JSON.stringify(quotes));
      chrome.storage.local.set({ "mindcache-quotes": quotes });
      this.updateExtensionCounts();
    }

    // Restore highlights on page load
    static restoreHighlights() {
      const highlights = JSON.parse(
        localStorage.getItem("mindcache-highlights") || "[]"
      );
      const currentUrl = window.location.href;
      const pageHighlights = highlights.filter((h) => h.url === currentUrl);

      pageHighlights.forEach((highlight) => {
        try {
          this.recreateHighlight(highlight);
        } catch (error) {
          console.warn("Could not restore highlight:", error);
        }
      });
    }

    static recreateHighlight(highlightData) {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let textNode;
      while ((textNode = walker.nextNode())) {
        const text = textNode.textContent;
        const index = text.indexOf(highlightData.text);

        if (index !== -1) {
          const range = document.createRange();
          range.setStart(textNode, index);
          range.setEnd(textNode, index + highlightData.text.length);

          const span = document.createElement("span");
          span.className = "mindcache-highlighted-text";
          span.style.backgroundColor = "#ffeb3b";
          span.style.color = "#000";
          span.style.padding = "2px 4px";
          span.style.borderRadius = "3px";
          span.dataset.highlightId = highlightData.id;

          try {
            range.surroundContents(span);
            break; // Found and highlighted, exit loop
          } catch (e) {
            // Continue searching if this node couldn't be highlighted
            continue;
          }
        }
      }
    }
  }

  // Initialize sync manager
  window.DataSyncManager = DataSyncManager;

  // Add complete selection toolbar functionality
  if (!window.MindCacheSelectionToolbar) {
    class MindCacheSelectionToolbar {
      constructor() {
        this.toolbar = null;
        this.isVisible = false;
        this.init();
      }

      init() {
        this.setupSelectionListener();
        this.createToolbarStyles();
      }

      setupSelectionListener() {
        document.addEventListener("mouseup", (e) => {
          setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText && selectedText.length > 3) {
              this.showSelectionToolbar(selectedText, selection, e);
            } else {
              this.hideSelectionToolbar();
            }
          }, 100);
        });

        document.addEventListener("selectionchange", () => {
          const selection = window.getSelection();
          if (!selection.toString().trim()) {
            this.hideSelectionToolbar();
          }
        });

        document.addEventListener("click", (e) => {
          if (!e.target.closest(".mindcache-selection-toolbar")) {
            this.hideSelectionToolbar();
          }
        });
      }

      createToolbarStyles() {
        if (document.getElementById("mindcache-toolbar-styles")) return;

        const style = document.createElement("style");
        style.id = "mindcache-toolbar-styles";
        style.textContent = `
          .mindcache-selection-toolbar {
            position: absolute;
            background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 8px;
            display: flex;
            gap: 4px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            animation: slideInToolbar 0.2s ease forwards;
          }

          .mindcache-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 8px 12px;
            border-radius: 6px;
            color: white;
            font-size: 16px;
            cursor: pointer;
            backdrop-filter: blur(5px);
            transition: all 0.2s ease;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 35px;
            min-height: 35px;
          }

          .mindcache-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }

          .mindcache-btn:active {
            transform: translateY(0);
          }

          @keyframes slideInToolbar {
            from {
              opacity: 0;
              transform: translateY(-10px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `;
        document.head.appendChild(style);
      }

      createToolbar() {
        const toolbar = document.createElement("div");
        toolbar.className = "mindcache-selection-toolbar";
        toolbar.innerHTML = `
          <button class="mindcache-btn save-quote" title="Save Quote">💾</button>
          <button class="mindcache-btn add-note" title="Add Note">💭</button>
          <button class="mindcache-btn highlight" title="Highlight">🖍️</button>
          <button class="mindcache-btn copy" title="Copy">📋</button>
          <button class="mindcache-btn search" title="Search">🔍</button>
          <button class="mindcache-btn ai-insights" title="AI Insights">🧠</button>
        `;
        return toolbar;
      }

      showSelectionToolbar(selectedText, selection, event) {
        this.hideSelectionToolbar();

        this.toolbar = this.createToolbar();
        document.body.appendChild(this.toolbar);

        // Position toolbar
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const toolbarRect = this.toolbar.getBoundingClientRect();

        let top = rect.top - toolbarRect.height - 10;
        let left = rect.left + rect.width / 2 - toolbarRect.width / 2;

        // Adjust if toolbar would be off-screen
        if (top < 10) top = rect.bottom + 10;
        if (left < 10) left = 10;
        if (left + toolbarRect.width > window.innerWidth - 10) {
          left = window.innerWidth - toolbarRect.width - 10;
        }

        this.toolbar.style.top = `${top + window.scrollY}px`;
        this.toolbar.style.left = `${left}px`;

        this.setupToolbarEvents(selectedText, selection);
        this.isVisible = true;
      }

      setupToolbarEvents(selectedText, selection) {
        const toolbar = this.toolbar;

        toolbar.querySelector(".save-quote").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          const currentText = currentSelection.toString().trim();
          if (currentText) {
            const quoteData = {
              id:
                Date.now().toString(36) + Math.random().toString(36).substr(2),
              text: currentText,
              url: window.location.href,
              domain: window.location.hostname,
              title: document.title,
              timestamp: new Date().toISOString(),
              context: window.getSelectionContext
                ? window.getSelectionContext(currentSelection)
                : {},
            };

            DataSyncManager.notifyQuoteSaved(quoteData);
            this.showToast("💾 Quote saved successfully!");
          }
          this.hideSelectionToolbar();
        });

        toolbar.querySelector(".add-note").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          const currentText = currentSelection.toString().trim();
          if (currentText) {
            if (window.showEnhancedNoteDialog) {
              window.showEnhancedNoteDialog(currentText, currentSelection);
            } else {
              const note = prompt("Add your note:");
              if (note) {
                const noteData = {
                  id:
                    Date.now().toString(36) +
                    Math.random().toString(36).substr(2),
                  selectedText: currentText,
                  noteText: note,
                  url: window.location.href,
                  domain: window.location.hostname,
                  title: document.title,
                  timestamp: new Date().toISOString(),
                  context: {},
                };
                DataSyncManager.notifyNoteAdded(noteData);
                this.showToast("💭 Note added successfully!");
              }
            }
          }
          this.hideSelectionToolbar();
        });

        toolbar.querySelector(".highlight").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          const currentText = currentSelection.toString().trim();
          if (currentText && currentSelection.rangeCount > 0) {
            const highlightData = {
              id:
                Date.now().toString(36) + Math.random().toString(36).substr(2),
              text: currentText,
              url: window.location.href,
              domain: window.location.hostname,
              title: document.title,
              timestamp: new Date().toISOString(),
              context: window.getSelectionContext
                ? window.getSelectionContext(currentSelection)
                : {},
            };

            // Create highlight element
            const range = currentSelection.getRangeAt(0);
            const span = document.createElement("span");
            span.className = "mindcache-highlighted-text";
            span.style.backgroundColor = "#ffeb3b";
            span.style.color = "#000";
            span.style.padding = "2px 4px";
            span.style.borderRadius = "3px";
            span.dataset.highlightId = highlightData.id;

            try {
              range.surroundContents(span);
              DataSyncManager.notifyHighlightAdded(highlightData);
              this.showToast("🖍️ Text highlighted!");
            } catch (e) {
              console.warn("Could not highlight selection:", e);
              this.showToast("Could not highlight this selection");
            }
          }
          this.hideSelectionToolbar();
        });

        toolbar.querySelector(".copy").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          const currentText = currentSelection.toString().trim();
          if (currentText) {
            navigator.clipboard
              .writeText(currentText)
              .then(() => {
                this.showToast("📋 Text copied to clipboard!");
              })
              .catch(() => {
                const textArea = document.createElement("textarea");
                textArea.value = currentText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
                this.showToast("📋 Text copied to clipboard!");
              });
          }
          this.hideSelectionToolbar();
        });

        toolbar.querySelector(".search").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          const currentText = currentSelection.toString().trim();
          if (currentText) {
            window.open(
              `https://www.google.com/search?q=${encodeURIComponent(
                currentText
              )}`,
              "_blank"
            );
            this.showToast("🔍 Searching for selected text...");
          }
          this.hideSelectionToolbar();
        });

        toolbar.querySelector(".ai-insights").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          const currentText = currentSelection.toString().trim();
          if (currentText && window.getAIInsights) {
            window.getAIInsights(currentText);
            this.showToast("🧠 Getting AI insights...");
          }
          this.hideSelectionToolbar();
        });
      }

      hideSelectionToolbar() {
        if (this.toolbar) {
          this.toolbar.remove();
          this.toolbar = null;
          this.isVisible = false;
        }
      }

      showToast(message) {
        const toast = document.createElement("div");
        toast.className = "mindcache-toast";
        toast.textContent = message;

        Object.assign(toast.style, {
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "linear-gradient(135deg, #4a5568 0%, #2d3748 100%)",
          color: "white",
          padding: "12px 20px",
          borderRadius: "8px",
          zIndex: "10001",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)",
          animation: "slideInToast 0.3s ease forwards",
        });

        const toastStyle = document.createElement("style");
        toastStyle.textContent = `
          @keyframes slideInToast {
            from {
              opacity: 0;
              transform: translateX(100%) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }
        `;
        document.head.appendChild(toastStyle);

        document.body.appendChild(toast);

        setTimeout(() => {
          toast.style.animation = "slideOutToast 0.3s ease forwards";
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
    }

    window.MindCacheSelectionToolbar = new MindCacheSelectionToolbar();
  }

  setTimeout(() => {
    if (!window.mindCacheContentScript) {
      console.log("Main content script not loaded yet");
      return;
    }

    // Enhanced Note Dialog
    if (!window.showEnhancedNoteDialog) {
      window.showEnhancedNoteDialog = function (selectedText, selection) {
        const dialog = document.createElement("div");
        dialog.className = "mindcache-enhanced-note-dialog";
        dialog.innerHTML = `
          <div class="note-dialog-overlay">
            <div class="note-dialog-content">
              <div class="note-dialog-header">
                <h3>💭 Add Your Note</h3>
                <button class="note-dialog-close">×</button>
              </div>
              <div class="selected-quote">
                <span class="quote-icon">📝</span>
                "${selectedText.substring(0, 150)}${
          selectedText.length > 150 ? "..." : ""
        }"
              </div>
              <div class="note-input-section">
                <textarea 
                  class="note-textarea" 
                  placeholder="What's your thought about this text? Add tags with #hashtag..."
                  rows="4"
                ></textarea>
                <div class="note-metadata">
                  <span class="site-info">📍 ${window.location.hostname}</span>
                  <span class="char-count">0/500</span>
                </div>
              </div>
              <div class="note-dialog-actions">
                <button class="note-btn note-cancel">Cancel</button>
                <button class="note-btn note-save">💾 Save Note</button>
              </div>
            </div>
          </div>
        `;

        // Enhanced dialog styles
        const dialogStyle = document.createElement("style");
        dialogStyle.textContent = `
          .mindcache-enhanced-note-dialog {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          .note-dialog-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeInDialog 0.3s ease;
          }

          .note-dialog-content {
            background: white;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUpDialog 0.3s ease;
          }

          .note-dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }

          .note-dialog-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
          }

          .note-dialog-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
          }

          .note-dialog-close:hover {
            background: rgba(255, 255, 255, 0.2);
          }

          .selected-quote {
            margin: 20px 24px;
            padding: 16px;
            background: #f8fafc;
            border-left: 4px solid #667eea;
            border-radius: 8px;
            font-style: italic;
            color: #4a5568;
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }

          .quote-icon {
            font-size: 18px;
            margin-top: 2px;
          }

          .note-input-section {
            padding: 0 24px;
            margin-bottom: 20px;
          }

          .note-textarea {
            width: 100%;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
            min-height: 100px;
            transition: border-color 0.2s;
            box-sizing: border-box;
          }

          .note-textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .note-metadata {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            font-size: 12px;
            color: #718096;
          }

          .site-info {
            background: #edf2f7;
            padding: 4px 8px;
            border-radius: 4px;
          }

          .char-count {
            font-weight: 500;
          }

          .note-dialog-actions {
            display: flex;
            gap: 12px;
            padding: 20px 24px;
            justify-content: flex-end;
            background: #f8fafc;
          }

          .note-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .note-cancel {
            background: #e2e8f0;
            color: #4a5568;
          }

          .note-cancel:hover {
            background: #cbd5e0;
          }

          .note-save {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }

          .note-save:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }

          .note-save:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          @keyframes fadeInDialog {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUpDialog {
            from { 
              transform: translateY(50px) scale(0.9);
              opacity: 0;
            }
            to { 
              transform: translateY(0) scale(1);
              opacity: 1;
            }
          }

          @keyframes fadeOutDialog {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `;

        document.head.appendChild(dialogStyle);
        document.body.appendChild(dialog);

        const textarea = dialog.querySelector(".note-textarea");
        const charCount = dialog.querySelector(".char-count");
        const saveBtn = dialog.querySelector(".note-save");
        const cancelBtn = dialog.querySelector(".note-cancel");
        const closeBtn = dialog.querySelector(".note-dialog-close");

        // Character counter
        textarea.addEventListener("input", () => {
          const length = textarea.value.length;
          charCount.textContent = `${length}/500`;
          charCount.style.color = length > 450 ? "#e53e3e" : "#718096";
          saveBtn.disabled = length === 0 || length > 500;
        });

        // Save note
        saveBtn.addEventListener("click", () => {
          const noteText = textarea.value.trim();
          if (noteText) {
            const noteData = {
              id:
                Date.now().toString(36) + Math.random().toString(36).substr(2),
              selectedText: selectedText,
              noteText: noteText,
              url: window.location.href,
              domain: window.location.hostname,
              title: document.title,
              timestamp: new Date().toISOString(),
              context: selection
                ? window.getSelectionContext
                  ? window.getSelectionContext(selection)
                  : {}
                : {},
            };

            DataSyncManager.notifyNoteAdded(noteData);

            // Show success animation
            saveBtn.innerHTML = "✅ Saved!";
            saveBtn.style.background = "#48bb78";

            setTimeout(() => {
              dialog.style.animation = "fadeOutDialog 0.3s ease";
              setTimeout(() => dialog.remove(), 300);
            }, 800);
          }
        });

        // Cancel/close handlers
        [cancelBtn, closeBtn].forEach((btn) => {
          btn.addEventListener("click", () => {
            dialog.style.animation = "fadeOutDialog 0.3s ease";
            setTimeout(() => dialog.remove(), 300);
          });
        });

        // Click outside to close
        dialog
          .querySelector(".note-dialog-overlay")
          .addEventListener("click", (e) => {
            if (e.target === dialog.querySelector(".note-dialog-overlay")) {
              cancelBtn.click();
            }
          });

        // Focus textarea
        setTimeout(() => textarea.focus(), 100);
      };
    }

    // Simple Floating Indicator for Current Page MindCache Data
    if (!window.MindCacheFloatingIndicator) {
      class MindCacheFloatingIndicator {
        constructor() {
          this.domain = window.location.hostname;
          this.indicator = null;
          this.init();
        }

        init() {
          this.createIndicator();
          this.updateCounts();

          // Update counts when data changes
          setInterval(() => this.updateCounts(), 3000);

          // Show on page load briefly
          setTimeout(() => this.showBriefly(), 2000);
        }

        createIndicator() {
          this.indicator = document.createElement("div");
          this.indicator.className = "mindcache-floating-indicator";

          Object.assign(this.indicator.style, {
            position: "fixed",
            bottom: "20px",
            left: "20px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "500",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            zIndex: "9999",
            cursor: "pointer",
            transition: "all 0.3s ease",
            opacity: "0",
            transform: "translateY(10px)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)",
          });

          this.indicator.addEventListener("click", () => {
            // Show extension popup or current page data summary
            if (window.MindCacheActivityTracker) {
              window.MindCacheActivityTracker.showSiteData();
            } else {
              console.log("Activity tracker not loaded");
            }
          });

          this.indicator.addEventListener("mouseenter", () => {
            this.indicator.style.transform = "translateY(0) scale(1.05)";
            this.indicator.style.opacity = "1";
          });

          this.indicator.addEventListener("mouseleave", () => {
            this.indicator.style.transform = "translateY(0) scale(1)";
            setTimeout(() => {
              this.indicator.style.opacity = "0.4";
            }, 1000);
          });

          document.body.appendChild(this.indicator);
        }

        updateCounts() {
          const highlights = JSON.parse(
            localStorage.getItem("mindcache-highlights") || "[]"
          );
          const notes = JSON.parse(
            localStorage.getItem("mindcache-notes") || "[]"
          );
          const quotes = JSON.parse(
            localStorage.getItem("mindcache-quotes") || "[]"
          );

          const domainHighlights = highlights.filter(
            (h) => h.domain === this.domain
          );
          const domainNotes = notes.filter((n) => n.domain === this.domain);
          const domainQuotes = quotes.filter((q) => q.domain === this.domain);

          const total =
            domainHighlights.length + domainNotes.length + domainQuotes.length;

          if (total === 0) {
            this.indicator.style.display = "none";
            return;
          }

          this.indicator.style.display = "block";
          this.indicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>📚</span>
              <span>${total}</span>
              <span style="font-size: 10px; opacity: 0.8;">items</span>
            </div>
          `;
        }

        showBriefly() {
          this.indicator.style.opacity = "0.8";
          this.indicator.style.transform = "translateY(0)";

          setTimeout(() => {
            this.indicator.style.opacity = "0.4";
          }, 4000);
        }
      }

      window.MindCacheFloatingIndicator = new MindCacheFloatingIndicator();
    }

    // Enhanced Activity Tracker with Meaningful Interactions
    if (!window.MindCacheActivityTracker) {
      class MindCacheActivityTracker {
        constructor() {
          this.activities = [];
          this.interactions = [];
          this.readingTime = 0;
          this.scrollBehavior = {
            totalScrolled: 0,
            meaningfulScrolls: 0,
            scrollDirection: "down",
            lastScrollY: 0,
          };
          this.clickPatterns = {
            totalClicks: 0,
            meaningfulClicks: 0,
            clickTypes: {},
          };
          this.lastActivity = Date.now();
          this.sessionStart = Date.now();
          this.init();
        }

        init() {
          this.setupEventListeners();
          this.startTracking();
          this.setupPeriodicSave();
        }

        setupEventListeners() {
          // Meaningful scroll tracking
          let scrollTimeout;
          document.addEventListener("scroll", () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(
              () => this.handleMeaningfulScroll(),
              150
            );
          });

          // Meaningful click tracking
          document.addEventListener(
            "click",
            this.handleMeaningfulClick.bind(this),
            true
          );

          // Text selection tracking
          document.addEventListener(
            "selectionchange",
            this.handleTextSelection.bind(this)
          );

          // Reading time tracking
          document.addEventListener(
            "visibilitychange",
            this.handleVisibilityChange.bind(this)
          );

          // Hover patterns for content engagement
          document.addEventListener(
            "mousemove",
            this.handleMouseMovement.bind(this)
          );

          // Keyboard interactions
          document.addEventListener(
            "keydown",
            this.handleKeyInteraction.bind(this)
          );

          // Focus tracking on input elements
          document.addEventListener(
            "focusin",
            this.handleElementFocus.bind(this)
          );
        }

        handleMeaningfulScroll() {
          const currentScrollY = window.scrollY;
          const scrollDelta = Math.abs(
            currentScrollY - this.scrollBehavior.lastScrollY
          );

          // Only count meaningful scrolls (more than 100px)
          if (scrollDelta > 100) {
            this.scrollBehavior.meaningfulScrolls++;
            this.scrollBehavior.totalScrolled += scrollDelta;
            this.scrollBehavior.scrollDirection =
              currentScrollY > this.scrollBehavior.lastScrollY ? "down" : "up";

            this.recordActivity("meaningful_scroll", {
              scrollY: currentScrollY,
              scrollDelta: scrollDelta,
              direction: this.scrollBehavior.scrollDirection,
              timestamp: Date.now(),
            });
          }

          this.scrollBehavior.lastScrollY = currentScrollY;
        }

        handleMeaningfulClick(e) {
          this.clickPatterns.totalClicks++;

          const target = e.target;
          const tagName = target.tagName.toLowerCase();
          const isContentClick = this.isContentElement(target);
          const hasText =
            target.textContent && target.textContent.trim().length > 0;

          // Count as meaningful if it's on content, links, buttons, or interactive elements
          if (
            isContentClick ||
            ["a", "button", "input", "select", "textarea"].includes(tagName)
          ) {
            this.clickPatterns.meaningfulClicks++;

            // Track click types
            this.clickPatterns.clickTypes[tagName] =
              (this.clickPatterns.clickTypes[tagName] || 0) + 1;

            this.recordActivity("meaningful_click", {
              element: tagName,
              hasText: hasText,
              textContent: hasText ? target.textContent.substring(0, 50) : "",
              className: target.className,
              isContentClick: isContentClick,
              timestamp: Date.now(),
            });
          }
        }

        handleTextSelection() {
          const selection = window.getSelection();
          const selectedText = selection.toString().trim();

          if (selectedText && selectedText.length > 10) {
            this.recordActivity("text_selection", {
              selectedText: selectedText.substring(0, 100),
              selectionLength: selectedText.length,
              timestamp: Date.now(),
            });
          }
        }

        handleVisibilityChange() {
          if (document.hidden) {
            this.recordActivity("page_blur", {
              sessionDuration: Date.now() - this.sessionStart,
              timestamp: Date.now(),
            });
          } else {
            this.recordActivity("page_focus", { timestamp: Date.now() });
            this.sessionStart = Date.now(); // Reset session on return
          }
        }

        handleMouseMovement(e) {
          // Track hover over content elements (throttled)
          if (!this.lastHoverTrack || Date.now() - this.lastHoverTrack > 2000) {
            const target = e.target;
            if (this.isContentElement(target)) {
              this.recordActivity("content_hover", {
                element: target.tagName.toLowerCase(),
                hasText:
                  target.textContent && target.textContent.trim().length > 0,
                timestamp: Date.now(),
              });
              this.lastHoverTrack = Date.now();
            }
          }
        }

        handleKeyInteraction(e) {
          // Track meaningful keyboard interactions
          const meaningfulKeys = [
            "ArrowDown",
            "ArrowUp",
            "PageDown",
            "PageUp",
            "Home",
            "End",
            "Space",
          ];

          if (meaningfulKeys.includes(e.key)) {
            this.recordActivity("navigation_key", {
              key: e.key,
              timestamp: Date.now(),
            });
          }

          // Track search/typing patterns
          if (e.ctrlKey && e.key === "f") {
            this.recordActivity("search_initiated", { timestamp: Date.now() });
          }
        }

        handleElementFocus(e) {
          const target = e.target;
          if (
            ["input", "textarea", "select"].includes(
              target.tagName.toLowerCase()
            )
          ) {
            this.recordActivity("form_interaction", {
              element: target.tagName.toLowerCase(),
              inputType: target.type || "text",
              timestamp: Date.now(),
            });
          }
        }

        isContentElement(element) {
          const contentTags = [
            "p",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "article",
            "section",
            "div",
            "span",
            "blockquote",
            "li",
          ];
          const tagName = element.tagName.toLowerCase();

          return (
            contentTags.includes(tagName) &&
            element.textContent &&
            element.textContent.trim().length > 20
          );
        }

        recordActivity(type, data) {
          const activity = {
            type,
            data,
            url: window.location.href,
            domain: window.location.hostname,
            timestamp: Date.now(),
          };

          this.activities.push(activity);
          this.lastActivity = Date.now();

          // Keep only last 200 activities
          if (this.activities.length > 200) {
            this.activities = this.activities.slice(-200);
          }
        }

        setupPeriodicSave() {
          // Save activity data every 30 seconds
          setInterval(() => {
            this.saveActivityData();
          }, 30000);

          // Save on page unload
          window.addEventListener("beforeunload", () => {
            this.saveActivityData();
          });
        }

        saveActivityData() {
          const activityData = {
            activities: this.activities,
            scrollBehavior: this.scrollBehavior,
            clickPatterns: this.clickPatterns,
            sessionDuration: Date.now() - this.sessionStart,
            lastUpdate: Date.now(),
            domain: window.location.hostname,
          };

          localStorage.setItem(
            `mindcache-activity-${window.location.hostname}`,
            JSON.stringify(activityData)
          );
        }

        startTracking() {
          // Record page visit with enhanced data
          this.recordActivity("page_visit", {
            url: window.location.href,
            title: document.title,
            timestamp: Date.now(),
            userAgent: navigator.userAgent.substring(0, 100),
          });
        }

        getActivitySummary() {
          const sessionDuration = Date.now() - this.sessionStart;

          return {
            totalActivities: this.activities.length,
            meaningfulScrolls: this.scrollBehavior.meaningfulScrolls,
            meaningfulClicks: this.clickPatterns.meaningfulClicks,
            totalScrolled: this.scrollBehavior.totalScrolled,
            sessionDuration: sessionDuration,
            lastActivity: this.lastActivity,
            clickTypes: this.clickPatterns.clickTypes,
            engagementScore: this.calculateEngagementScore(),
            activities: this.activities.slice(-20), // Return last 20 for preview
          };
        }

        calculateEngagementScore() {
          const sessionMinutes = (Date.now() - this.sessionStart) / 60000;
          const scrollScore =
            Math.min(this.scrollBehavior.meaningfulScrolls / 10, 1) * 25;
          const clickScore =
            Math.min(this.clickPatterns.meaningfulClicks / 5, 1) * 25;
          const timeScore = Math.min(sessionMinutes / 5, 1) * 25;
          const interactionScore =
            Math.min(this.activities.length / 50, 1) * 25;

          return Math.round(
            scrollScore + clickScore + timeScore + interactionScore
          );
        }

        showSiteData() {
          // This method will be called by the floating indicator
          const highlights = JSON.parse(
            localStorage.getItem("mindcache-highlights") || "[]"
          );
          const notes = JSON.parse(
            localStorage.getItem("mindcache-notes") || "[]"
          );
          const quotes = JSON.parse(
            localStorage.getItem("mindcache-quotes") || "[]"
          );

          const domainHighlights = highlights.filter(
            (h) => h.domain === window.location.hostname
          );
          const domainNotes = notes.filter(
            (n) => n.domain === window.location.hostname
          );
          const domainQuotes = quotes.filter(
            (q) => q.domain === window.location.hostname
          );

          // Create modal to show data
          this.createDataModal(domainHighlights, domainNotes, domainQuotes);
        }

        createDataModal(highlights, notes, quotes) {
          const modal = document.createElement("div");
          modal.className = "mindcache-data-modal";

          Object.assign(modal.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            zIndex: "10000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          });

          const content = document.createElement("div");
          Object.assign(content.style, {
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "600px",
            maxHeight: "80vh",
            overflowY: "auto",
            position: "relative",
          });

          const activitySummary = this.getActivitySummary();

          content.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #2d3748;">MindCache Data - ${
              window.location.hostname
            }</h3>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
              <div style="text-align: center; padding: 12px; background: #f7fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: bold; color: #667eea;">${
                  highlights.length
                }</div>
                <div style="font-size: 12px; color: #718096;">Highlights</div>
              </div>
              <div style="text-align: center; padding: 12px; background: #f7fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: bold; color: #764ba2;">${
                  notes.length
                }</div>
                <div style="font-size: 12px; color: #718096;">Notes</div>
              </div>
              <div style="text-align: center; padding: 12px; background: #f7fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: bold; color: #48bb78;">${
                  quotes.length
                }</div>
                <div style="font-size: 12px; color: #718096;">Quotes</div>
              </div>
            </div>

            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #4a5568;">Session Activity</h4>
              <div style="background: #f7fafc; padding: 12px; border-radius: 8px; font-size: 14px;">
                <div>Meaningful Scrolls: <strong>${
                  activitySummary.meaningfulScrolls
                }</strong></div>
                <div>Meaningful Clicks: <strong>${
                  activitySummary.meaningfulClicks
                }</strong></div>
                <div>Engagement Score: <strong>${
                  activitySummary.engagementScore
                }%</strong></div>
                <div>Session Duration: <strong>${Math.round(
                  activitySummary.sessionDuration / 60000
                )}m</strong></div>
              </div>
            </div>

            <button style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 20px; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">×</button>
          `;

          modal.appendChild(content);
          document.body.appendChild(modal);

          modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
          });
        }
      }

      window.MindCacheActivityTracker = new MindCacheActivityTracker();
    }

    // Site Activity Tracker (Legacy support)
    if (!window.MindCacheSiteTracker) {
      class MindCacheSiteTracker {
        constructor() {
          this.domain = window.location.hostname;
          this.activityIndicator = null;
          this.init();
        }

        init() {
          this.createActivityIndicator();
          this.updateActivityCount();
          this.setupKeyboardShortcuts();

          // Update count when data changes
          setInterval(() => this.updateActivityCount(), 2000);
        }

        createActivityIndicator() {
          this.activityIndicator = document.createElement("div");
          this.activityIndicator.className = "mindcache-activity-indicator";

          Object.assign(this.activityIndicator.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            padding: "10px 16px",
            borderRadius: "25px",
            fontSize: "12px",
            fontWeight: "600",
            color: "white",
            cursor: "pointer",
            zIndex: "9999",
            transition: "all 0.3s ease",
            background: "linear-gradient(135deg, #4a5568 0%, #2d3748 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
          });

          this.activityIndicator.addEventListener("click", () =>
            this.showSiteData()
          );
          document.body.appendChild(this.activityIndicator);
        }

        updateActivityCount() {
          const highlights = JSON.parse(
            localStorage.getItem("mindcache-highlights") || "[]"
          );
          const notes = JSON.parse(
            localStorage.getItem("mindcache-notes") || "[]"
          );
          const quotes = JSON.parse(
            localStorage.getItem("mindcache-quotes") || "[]"
          );

          const domainHighlights = highlights.filter(
            (h) => h.domain === this.domain
          );
          const domainNotes = notes.filter((n) => n.domain === this.domain);
          const domainQuotes = quotes.filter((q) => q.domain === this.domain);

          const total =
            domainHighlights.length + domainNotes.length + domainQuotes.length;

          this.activityIndicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              📊 <span style="font-weight: bold;">${total}</span> interactions
            </div>
            <div style="font-size: 10px; opacity: 0.8; margin-top: 2px;">
              ${domainHighlights.length}🖍️ ${domainNotes.length}💭 ${domainQuotes.length}💾
            </div>
          `;
        }

        setupKeyboardShortcuts() {
          document.addEventListener("keydown", (e) => {
            // Ctrl+Shift+M to show bottom popup
            if (e.ctrlKey && e.shiftKey && e.key === "M") {
              e.preventDefault();
              this.showBottomPopup();
            }
            // Ctrl+Shift+D to show detailed modal
            if (e.ctrlKey && e.shiftKey && e.key === "D") {
              e.preventDefault();
              this.showSiteData();
            }
          });
        }

        showSiteData() {
          const highlights = JSON.parse(
            localStorage.getItem("mindcache-highlights") || "[]"
          );
          const notes = JSON.parse(
            localStorage.getItem("mindcache-notes") || "[]"
          );
          const quotes = JSON.parse(
            localStorage.getItem("mindcache-quotes") || "[]"
          );

          const domainHighlights = highlights.filter(
            (h) => h.domain === this.domain
          );
          const domainNotes = notes.filter((n) => n.domain === this.domain);
          const domainQuotes = quotes.filter((q) => q.domain === this.domain);

          const modal = document.createElement("div");
          modal.className = "mindcache-site-modal";
          modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); z-index: 10002; display: flex; align-items: center; justify-content: center;">
              <div style="background: white; border-radius: 16px; max-width: 600px; width: 90%; max-height: 80vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;">
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; justify-content: space-between; align-items: center;">
                  <h3 style="margin: 0; font-size: 18px;">📊 Site Activity - ${
                    this.domain
                  }</h3>
                  <button class="modal-close-btn" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 5px; border-radius: 50%; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='none'">×</button>
                </div>
                <div style="padding: 20px; max-height: 60vh; overflow-y: auto;">
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px;">
                    <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px; border: 2px solid #e2e8f0;">
                      <div style="font-size: 32px; margin-bottom: 8px;">🖍️</div>
                      <div style="font-weight: bold; font-size: 24px; color: #2d3748;">${
                        domainHighlights.length
                      }</div>
                      <div style="font-size: 12px; color: #718096; font-weight: 500;">Highlights</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px; border: 2px solid #e2e8f0;">
                      <div style="font-size: 32px; margin-bottom: 8px;">💭</div>
                      <div style="font-weight: bold; font-size: 24px; color: #2d3748;">${
                        domainNotes.length
                      }</div>
                      <div style="font-size: 12px; color: #718096; font-weight: 500;">Notes</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px; border: 2px solid #e2e8f0;">
                      <div style="font-size: 32px; margin-bottom: 8px;">💾</div>
                      <div style="font-weight: bold; font-size: 24px; color: #2d3748;">${
                        domainQuotes.length
                      }</div>
                      <div style="font-size: 12px; color: #718096; font-weight: 500;">Quotes</div>
                    </div>
                  </div>
                  
                  <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                    <div style="font-weight: 600; color: #2d3748; margin-bottom: 8px;">📈 Activity Summary</div>
                    <div style="font-size: 14px; color: #4a5568; line-height: 1.6;">
                      You have <strong>${
                        domainHighlights.length +
                        domainNotes.length +
                        domainQuotes.length
                      } total interactions</strong> on this site.
                      <br>Last activity: ${this.getLastActivityTime(
                        domainHighlights,
                        domainNotes,
                        domainQuotes
                      )}
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <button class="clear-highlights-btn" style="padding: 12px; background: #fed7d7; color: #c53030; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background='#feb2b2'" onmouseout="this.style.background='#fed7d7'">🗑️ Clear Highlights</button>
                    <button class="clear-notes-btn" style="padding: 12px; background: #fed7d7; color: #c53030; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background='#feb2b2'" onmouseout="this.style.background='#fed7d7'">🗑️ Clear Notes</button>
                  </div>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <button class="clear-quotes-btn" style="padding: 12px; background: #fed7d7; color: #c53030; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background='#feb2b2'" onmouseout="this.style.background='#fed7d7'">🗑️ Clear Quotes</button>
                    <button class="export-all-btn" style="padding: 12px; background: #bee3f8; color: #2b6cb0; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.background='#90cdf4'" onmouseout="this.style.background='#bee3f8'">📤 Export All</button>
                  </div>
                </div>
              </div>
            </div>
          `;

          document.body.appendChild(modal);

          // Set up event listeners with proper scope
          const closeModal = () => {
            modal.style.animation = "fadeOut 0.3s ease";
            setTimeout(() => modal.remove(), 300);
          };

          // Close button
          modal
            .querySelector(".modal-close-btn")
            .addEventListener("click", closeModal);

          // Click outside to close
          modal.addEventListener("click", (e) => {
            if (e.target === modal || e.target.style.position === "fixed") {
              closeModal();
            }
          });

          // Clear highlights
          modal
            .querySelector(".clear-highlights-btn")
            .addEventListener("click", () => {
              if (domainHighlights.length === 0) {
                alert("No highlights to clear on this site");
                return;
              }
              if (
                confirm(
                  `Clear all ${domainHighlights.length} highlights from ${this.domain}?`
                )
              ) {
                const allHighlights = JSON.parse(
                  localStorage.getItem("mindcache-highlights") || "[]"
                );
                const filteredHighlights = allHighlights.filter(
                  (h) => h.domain !== this.domain
                );
                localStorage.setItem(
                  "mindcache-highlights",
                  JSON.stringify(filteredHighlights)
                );
                chrome.storage.local.set({
                  "mindcache-highlights": filteredHighlights,
                });

                // Remove highlight elements from page
                document
                  .querySelectorAll(".mindcache-highlighted-text")
                  .forEach((el) => {
                    el.outerHTML = el.textContent;
                  });

                closeModal();
                this.updateActivityCount();
                this.showNotification("✅ Highlights cleared successfully");
              }
            });

          // Clear notes
          modal
            .querySelector(".clear-notes-btn")
            .addEventListener("click", () => {
              if (domainNotes.length === 0) {
                alert("No notes to clear on this site");
                return;
              }
              if (
                confirm(
                  `Clear all ${domainNotes.length} notes from ${this.domain}?`
                )
              ) {
                const allNotes = JSON.parse(
                  localStorage.getItem("mindcache-notes") || "[]"
                );
                const filteredNotes = allNotes.filter(
                  (n) => n.domain !== this.domain
                );
                localStorage.setItem(
                  "mindcache-notes",
                  JSON.stringify(filteredNotes)
                );
                chrome.storage.local.set({ "mindcache-notes": filteredNotes });
                closeModal();
                this.updateActivityCount();
                this.showNotification("✅ Notes cleared successfully");
              }
            });

          // Clear quotes
          modal
            .querySelector(".clear-quotes-btn")
            .addEventListener("click", () => {
              if (domainQuotes.length === 0) {
                alert("No quotes to clear on this site");
                return;
              }
              if (
                confirm(
                  `Clear all ${domainQuotes.length} quotes from ${this.domain}?`
                )
              ) {
                const allQuotes = JSON.parse(
                  localStorage.getItem("mindcache-quotes") || "[]"
                );
                const filteredQuotes = allQuotes.filter(
                  (q) => q.domain !== this.domain
                );
                localStorage.setItem(
                  "mindcache-quotes",
                  JSON.stringify(filteredQuotes)
                );
                chrome.storage.local.set({
                  "mindcache-quotes": filteredQuotes,
                });
                closeModal();
                this.updateActivityCount();
                this.showNotification("✅ Quotes cleared successfully");
              }
            });

          // Export all
          modal
            .querySelector(".export-all-btn")
            .addEventListener("click", () => {
              const exportData = {
                domain: this.domain,
                timestamp: new Date().toISOString(),
                highlights: domainHighlights,
                notes: domainNotes,
                quotes: domainQuotes,
                total:
                  domainHighlights.length +
                  domainNotes.length +
                  domainQuotes.length,
              };

              const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `mindcache-${this.domain}-${
                new Date().toISOString().split("T")[0]
              }.json`;
              a.click();
              URL.revokeObjectURL(url);

              closeModal();
              this.showNotification("📤 Data exported successfully");
            });

          // ESC key to close
          const escapeHandler = (e) => {
            if (e.key === "Escape") {
              closeModal();
              document.removeEventListener("keydown", escapeHandler);
            }
          };
          document.addEventListener("keydown", escapeHandler);

          // Add fade in animation
          const fadeInStyle = document.createElement("style");
          fadeInStyle.textContent = `
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.9); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes fadeOut {
              from { opacity: 1; transform: scale(1); }
              to { opacity: 0; transform: scale(0.9); }
            }
            .mindcache-site-modal > div {
              animation: fadeIn 0.3s ease forwards;
            }
          `;
          document.head.appendChild(fadeInStyle);
        }

        getLastActivityTime(highlights, notes, quotes) {
          const allItems = [...highlights, ...notes, ...quotes];
          if (allItems.length === 0) return "No activity yet";

          const latest = allItems.reduce((latest, item) => {
            return new Date(item.timestamp) > new Date(latest.timestamp)
              ? item
              : latest;
          });

          return (
            new Date(latest.timestamp).toLocaleDateString() +
            " at " +
            new Date(latest.timestamp).toLocaleTimeString()
          );
        }

        showNotification(message) {
          const notification = document.createElement("div");
          notification.textContent = message;

          Object.assign(notification.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "linear-gradient(135deg, #48bb78 0%, #38a169 100%)",
            color: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            zIndex: "10003",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            backdropFilter: "blur(10px)",
            fontSize: "14px",
            fontWeight: "500",
            animation: "slideInRight 0.3s ease forwards",
          });

          const notificationStyle = document.createElement("style");
          notificationStyle.textContent = `
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
              from { transform: translateX(0); opacity: 1; }
              to { transform: translateX(100%); opacity: 0; }
            }
          `;
          document.head.appendChild(notificationStyle);

          document.body.appendChild(notification);

          setTimeout(() => {
            notification.style.animation = "slideOutRight 0.3s ease forwards";
            setTimeout(() => {
              notification.remove();
              notificationStyle.remove();
            }, 300);
          }, 3000);
        }

        // New bottom popup method to show current page MindCache data
        showBottomPopup() {
          // Remove existing popup if present
          const existing = document.querySelector(".mindcache-bottom-popup");
          if (existing) {
            existing.remove();
            return;
          }

          const highlights = JSON.parse(
            localStorage.getItem("mindcache-highlights") || "[]"
          );
          const notes = JSON.parse(
            localStorage.getItem("mindcache-notes") || "[]"
          );
          const quotes = JSON.parse(
            localStorage.getItem("mindcache-quotes") || "[]"
          );

          const domainHighlights = highlights.filter(
            (h) => h.domain === this.domain
          );
          const domainNotes = notes.filter((n) => n.domain === this.domain);
          const domainQuotes = quotes.filter((q) => q.domain === this.domain);

          const allItems = [
            ...domainHighlights,
            ...domainNotes,
            ...domainQuotes,
          ]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10); // Show only latest 10 items

          const popup = document.createElement("div");
          popup.className = "mindcache-bottom-popup";
          popup.innerHTML = `
            <div style="
              position: fixed;
              bottom: 20px;
              right: 20px;
              width: 400px;
              max-height: 500px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              z-index: 10001;
              overflow: hidden;
              border: 1px solid #e2e8f0;
              animation: slideUpBottom 0.3s ease forwards;
            ">
              <div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <div>
                  <h3 style="margin: 0; font-size: 16px;">📚 ${this.domain}</h3>
                  <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">
                    ${domainHighlights.length} highlights • ${
            domainNotes.length
          } notes • ${domainQuotes.length} quotes
                  </div>
                </div>
                <button class="close-popup-btn" style="
                  background: none;
                  border: none;
                  color: white;
                  font-size: 20px;
                  cursor: pointer;
                  padding: 4px;
                  border-radius: 4px;
                  transition: background 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='none'">×</button>
              </div>
              
              <div style="max-height: 400px; overflow-y: auto; padding: 16px;">
                ${
                  allItems.length === 0
                    ? `
                  <div style="text-align: center; padding: 40px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
                    <p style="margin: 0; font-size: 14px;">No MindCache data for this page yet</p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #999;">Start highlighting text or adding notes!</p>
                  </div>
                `
                    : allItems
                        .map((item) => {
                          const itemType =
                            item.text && !item.content
                              ? "highlight"
                              : item.content
                              ? "note"
                              : "quote";
                          const icon =
                            itemType === "highlight"
                              ? "🖍️"
                              : itemType === "note"
                              ? "💭"
                              : "💾";
                          const content = item.text || item.content || "";
                          const date = new Date(
                            item.timestamp
                          ).toLocaleDateString();

                          return `
                    <div style="
                      margin-bottom: 12px;
                      padding: 12px;
                      background: ${
                        itemType === "highlight"
                          ? "#fef3c7"
                          : itemType === "note"
                          ? "#dbeafe"
                          : "#e0e7ff"
                      };
                      border-radius: 8px;
                      border-left: 4px solid ${
                        itemType === "highlight"
                          ? "#f59e0b"
                          : itemType === "note"
                          ? "#3b82f6"
                          : "#6366f1"
                      };
                      font-size: 13px;
                      line-height: 1.4;
                    ">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-weight: 600; color: #374151;">${icon} ${
                            itemType.charAt(0).toUpperCase() + itemType.slice(1)
                          }</span>
                        <span style="font-size: 11px; color: #6b7280;">${date}</span>
                      </div>
                      <div style="color: #1f2937;">${
                        content.length > 150
                          ? content.substring(0, 150) + "..."
                          : content
                      }</div>
                      ${
                        item.note && itemType === "highlight"
                          ? `<div style="margin-top: 6px; font-style: italic; color: #3b82f6; font-size: 12px;">Note: ${item.note}</div>`
                          : ""
                      }
                    </div>
                  `;
                        })
                        .join("")
                }
              </div>
              
              <div style="
                border-top: 1px solid #e2e8f0;
                padding: 12px 16px;
                background: #f8fafc;
                display: flex;
                gap: 8px;
              ">
                <button class="view-all-btn" style="
                  flex: 1;
                  background: #667eea;
                  color: white;
                  border: none;
                  padding: 8px 12px;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 12px;
                  transition: background 0.2s;
                " onmouseover="this.style.background='#5a6fd8'" onmouseout="this.style.background='#667eea'">
                  📋 View All
                </button>
                <button class="open-extension-btn" style="
                  flex: 1;
                  background: #10b981;
                  color: white;
                  border: none;
                  padding: 8px 12px;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 12px;
                  transition: background 0.2s;
                " onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                  🚀 Open Extension
                </button>
              </div>
            </div>
          `;

          // Add animation styles
          const style = document.createElement("style");
          style.textContent = `
            @keyframes slideUpBottom {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideDownBottom {
              from { transform: translateY(0); opacity: 1; }
              to { transform: translateY(100%); opacity: 0; }
            }
          `;
          document.head.appendChild(style);

          document.body.appendChild(popup);

          // Add event listeners
          const closePopup = () => {
            popup.style.animation = "slideDownBottom 0.3s ease forwards";
            setTimeout(() => {
              popup.remove();
              style.remove();
            }, 300);
          };

          popup
            .querySelector(".close-popup-btn")
            .addEventListener("click", closePopup);

          popup.querySelector(".view-all-btn").addEventListener("click", () => {
            this.showSiteData();
            closePopup();
          });

          popup
            .querySelector(".open-extension-btn")
            .addEventListener("click", () => {
              chrome.action.openPopup();
              closePopup();
            });

          // Auto close after 10 seconds
          setTimeout(closePopup, 10000);

          // Close on outside click
          setTimeout(() => {
            const outsideClickHandler = (e) => {
              if (!popup.contains(e.target)) {
                closePopup();
                document.removeEventListener("click", outsideClickHandler);
              }
            };
            document.addEventListener("click", outsideClickHandler);
          }, 100);
        }
      }

      window.MindCacheSiteTracker = new MindCacheSiteTracker();
    }

    // Initialize data sync
    DataSyncManager.updateExtensionCounts();

    // Add missing AI Insights functionality
    if (!window.getAIInsights) {
      window.getAIInsights = function (text) {
        // Create AI insights dialog
        const dialog = document.createElement("div");
        dialog.className = "mindcache-ai-insights-dialog";
        dialog.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 10003; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 16px; max-width: 700px; width: 90%; max-height: 80vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
              <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">🧠 AI Insights</h3>
                <button onclick="this.closest('div').remove()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
              </div>
              <div style="padding: 20px;">
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #667eea;">
                  <strong>Selected Text:</strong><br>
                  <em>"${text.substring(0, 200)}${
          text.length > 200 ? "..." : ""
        }"</em>
                </div>
                <div id="ai-insights-content" style="min-height: 100px;">
                  <div style="display: flex; align-items: center; gap: 10px; color: #666;">
                    <div style="width: 20px; height: 20px; border: 2px solid #667eea; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    Analyzing text...
                  </div>
                </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                  <button onclick="this.saveInsights()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-right: 10px;">💾 Save Insights</button>
                  <button onclick="this.shareInsights()" style="background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">📤 Share</button>
                </div>
              </div>
            </div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        `;

        document.body.appendChild(dialog);

        // Simulate AI analysis (in real implementation, this would call your backend)
        setTimeout(() => {
          const insights = this.generateMockInsights(text);
          const content = dialog.querySelector("#ai-insights-content");
          content.innerHTML = `
            <div style="space-y: 12px;">
              <div style="margin-bottom: 12px;">
                <strong style="color: #4a5568;">📝 Summary:</strong>
                <p style="margin: 4px 0 0 0; color: #718096;">${
                  insights.summary
                }</p>
              </div>
              <div style="margin-bottom: 12px;">
                <strong style="color: #4a5568;">🔑 Key Points:</strong>
                <ul style="margin: 4px 0 0 20px; color: #718096;">
                  ${insights.keyPoints
                    .map((point) => `<li style="margin: 2px 0;">${point}</li>`)
                    .join("")}
                </ul>
              </div>
              <div style="margin-bottom: 12px;">
                <strong style="color: #4a5568;">💡 Related Topics:</strong>
                <div style="margin: 4px 0 0 0; display: flex; flex-wrap: wrap; gap: 8px;">
                  ${insights.relatedTopics
                    .map(
                      (topic) =>
                        `<span style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #4a5568;">${topic}</span>`
                    )
                    .join("")}
                </div>
              </div>
              <div>
                <strong style="color: #4a5568;">🎯 Sentiment:</strong>
                <span style="margin-left: 8px; color: ${
                  insights.sentiment === "Positive"
                    ? "#48bb78"
                    : insights.sentiment === "Negative"
                    ? "#e53e3e"
                    : "#4299e1"
                }; font-weight: 600;">${insights.sentiment}</span>
              </div>
            </div>
          `;
        }, 1500);

        // Add functionality to buttons
        dialog.saveInsights = () => {
          const insightData = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            originalText: text,
            insights: dialog.querySelector("#ai-insights-content").innerText,
            url: window.location.href,
            domain: window.location.hostname,
            title: document.title,
            timestamp: new Date().toISOString(),
          };

          const insights = JSON.parse(
            localStorage.getItem("mindcache-ai-insights") || "[]"
          );
          insights.push(insightData);
          localStorage.setItem(
            "mindcache-ai-insights",
            JSON.stringify(insights)
          );
          chrome.storage.local.set({ "mindcache-ai-insights": insights });

          alert("AI insights saved successfully!");
        };

        dialog.shareInsights = () => {
          const insightText = dialog.querySelector(
            "#ai-insights-content"
          ).innerText;
          navigator
            .share({
              title: "AI Insights from MindCache",
              text: insightText,
              url: window.location.href,
            })
            .catch(() => {
              navigator.clipboard.writeText(insightText);
              alert("Insights copied to clipboard!");
            });
        };
      };

      window.generateMockInsights = function (text) {
        // This is a mock function - in production, this would call your AI backend
        const wordCount = text.split(" ").length;
        const sentences = text.split(".").filter((s) => s.trim().length > 0);

        return {
          summary: `This ${wordCount}-word text discusses ${
            sentences.length > 0 ? "various topics" : "a specific subject"
          } with ${sentences.length} main points. The content appears to be ${
            wordCount > 100 ? "comprehensive" : "concise"
          } and ${sentences.length > 3 ? "detailed" : "focused"}.`,
          keyPoints: [
            `Content length: ${wordCount} words`,
            `Structure: ${sentences.length} sentences`,
            `Reading time: ~${Math.ceil(wordCount / 200)} minutes`,
            `Complexity: ${
              wordCount > 50 ? "Moderate to High" : "Low to Moderate"
            }`,
          ],
          relatedTopics: ["Analysis", "Research", "Content", "Information"],
          sentiment:
            wordCount > 100
              ? "Neutral"
              : Math.random() > 0.5
              ? "Positive"
              : "Neutral",
        };
      };
    }

    // Enhanced selection context function
    if (!window.getSelectionContext) {
      window.getSelectionContext = function (selection) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element =
          container.nodeType === Node.TEXT_NODE
            ? container.parentElement
            : container;

        return {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          position: {
            x: range.getBoundingClientRect().left,
            y: range.getBoundingClientRect().top,
          },
          surroundingText: {
            before: this.getTextBefore(range, 50),
            after: this.getTextAfter(range, 50),
          },
        };
      };

      window.getTextBefore = function (range, length) {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let currentNode;
        let text = "";
        while ((currentNode = walker.nextNode())) {
          if (currentNode === range.startContainer) break;
          text += currentNode.textContent;
        }

        return text.slice(-length).trim();
      };

      window.getTextAfter = function (range, length) {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let currentNode;
        let foundStart = false;
        let text = "";

        while ((currentNode = walker.nextNode())) {
          if (currentNode === range.endContainer) {
            foundStart = true;
            continue;
          }
          if (foundStart) {
            text += currentNode.textContent;
            if (text.length >= length) break;
          }
        }

        return text.slice(0, length).trim();
      };
    }

    // Enhanced UI styles
    const style = document.createElement("style");
    style.textContent = `
      /* Enhanced Selection Toolbar */
      .mindcache-selection-toolbar {
        animation: slideInToolbar 0.2s ease forwards !important;
        backdrop-filter: blur(10px) !important;
        background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
      }

      @keyframes slideInToolbar {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .mindcache-btn {
        transition: all 0.2s ease !important;
        background: rgba(255,255,255,0.1) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
        padding: 8px 12px !important;
        border-radius: 6px !important;
        color: white !important;
        font-size: 20px !important;
        cursor: pointer !important;
        backdrop-filter: blur(5px) !important;
      }

      .mindcache-btn:hover {
        background: rgba(255,255,255,0.2) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      }

      .mindcache-btn:active {
        transform: translateY(0) !important;
      }

      /* Enhanced Toast */
      .mindcache-toast {
        animation: slideInToast 0.3s ease forwards !important;
        backdrop-filter: blur(10px) !important;
        background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
      }

      @keyframes slideInToast {
        from {
          opacity: 0;
          transform: translateX(100%) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }

      /* Enhanced Focus Mode */
      .mindcache-focus-toggle {
        animation: bounce 2s infinite !important;
        background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
        border: 2px solid rgba(255,255,255,0.1) !important;
        backdrop-filter: blur(10px) !important;
      }

      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {
          transform: translateY(0);
        }
        40% {
          transform: translateY(-5px);
        }
        60% {
          transform: translateY(-3px);
        }
      }

      .mindcache-focus-toggle:hover {
        animation: none !important;
        background: linear-gradient(135deg, #63b3ed 0%, #4299e1 100%) !important;
      }

      /* Enhanced Reading Progress */
      .mindcache-reading-progress {
        backdrop-filter: blur(10px) !important;
        background: rgba(255,255,255,0.1) !important;
        border-bottom: 1px solid rgba(255,255,255,0.1) !important;
      }

      /* Enhanced Notes Indicator */
      .mindcache-notes-indicator {
        animation: pulse 2s infinite !important;
        background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
        backdrop-filter: blur(10px) !important;
      }

      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(66, 153, 225, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(66, 153, 225, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(66, 153, 225, 0);
        }
      }

      /* Enhanced Dialog */
      .mindcache-note-dialog .mindcache-dialog-content {
        animation: slideInDialog 0.3s ease forwards !important;
        backdrop-filter: blur(20px) !important;
        background: rgba(255,255,255,0.95) !important;
        border: 1px solid rgba(0,0,0,0.1) !important;
      }

      @keyframes slideInDialog {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    // Initialize data sync and restore highlights
    DataSyncManager.updateExtensionCounts();
    DataSyncManager.restoreHighlights();

    console.log("MindCache fixes and enhancements loaded!");
  }, 2000);
})();
