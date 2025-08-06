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

    // Enhanced Focus Mode
    if (!window.MindCacheFocusMode) {
      class MindCacheFocusMode {
        constructor() {
          this.isActive = false;
          this.originalStyles = new Map();
          this.focusButton = null;
          this.readingProgress = null;
          this.init();
        }

        init() {
          this.createFocusButton();
          this.createReadingProgress();
          this.setupKeyboardShortcuts();
        }

        createFocusButton() {
          this.focusButton = document.createElement("div");
          this.focusButton.className = "mindcache-focus-toggle";
          this.focusButton.innerHTML = "🎯";
          this.focusButton.title = "Toggle Focus Mode (Ctrl+Shift+F)";

          Object.assign(this.focusButton.style, {
            position: "fixed",
            top: "80px",
            right: "20px",
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4a5568 0%, #2d3748 100%)",
            border: "2px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            cursor: "pointer",
            zIndex: "9998",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            transition: "all 0.3s ease",
            backdropFilter: "blur(10px)",
          });

          this.focusButton.addEventListener("click", () => this.toggle());
          document.body.appendChild(this.focusButton);
        }

        createReadingProgress() {
          this.readingProgress = document.createElement("div");
          this.readingProgress.className = "mindcache-reading-progress";

          Object.assign(this.readingProgress.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "0%",
            height: "3px",
            background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
            zIndex: "9999",
            transition: "width 0.3s ease",
            display: "none",
          });

          document.body.appendChild(this.readingProgress);

          window.addEventListener("scroll", () => {
            if (this.isActive) {
              this.updateReadingProgress();
            }
          });
        }

        updateReadingProgress() {
          const scrollTop = window.pageYOffset;
          const docHeight =
            document.documentElement.scrollHeight - window.innerHeight;
          const scrollPercent = (scrollTop / docHeight) * 100;
          this.readingProgress.style.width = Math.min(scrollPercent, 100) + "%";
        }

        setupKeyboardShortcuts() {
          document.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === "F") {
              e.preventDefault();
              this.toggle();
            }
            // ESC to exit focus mode
            if (e.key === "Escape" && this.isActive) {
              this.deactivate();
            }
          });
        }

        toggle() {
          if (this.isActive) {
            this.deactivate();
          } else {
            this.activate();
          }
        }

        activate() {
          this.isActive = true;
          this.focusButton.innerHTML = "👁️";
          this.focusButton.style.background =
            "linear-gradient(135deg, #63b3ed 0%, #4299e1 100%)";
          this.readingProgress.style.display = "block";
          this.updateReadingProgress();

          // Apply focus styles
          const style = document.createElement("style");
          style.id = "mindcache-focus-mode-styles";
          style.textContent = `
            body {
              background: #1a202c !important;
              color: #e2e8f0 !important;
            }
            
            * {
              transition: all 0.3s ease !important;
            }
            
            body > *:not(.mindcache-focus-toggle):not(.mindcache-selection-toolbar):not(.mindcache-enhanced-note-dialog):not(.mindcache-activity-indicator):not(.mindcache-reading-progress) {
              opacity: 0.4 !important;
              filter: blur(1px) grayscale(0.3) !important;
            }
            
            .mindcache-highlighted-text,
            .mindcache-highlighted-text *,
            *:has(.mindcache-highlighted-text) {
              opacity: 1 !important;
              filter: none !important;
              box-shadow: 0 0 20px rgba(255, 235, 59, 0.5) !important;
            }

            p:hover, h1:hover, h2:hover, h3:hover, h4:hover, h5:hover, h6:hover,
            article:hover, section:hover, div:hover, blockquote:hover {
              opacity: 1 !important;
              filter: none !important;
              background: rgba(102, 126, 234, 0.1) !important;
              border-radius: 6px !important;
              padding: 8px !important;
              box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2) !important;
            }

            /* Hide distracting elements */
            nav, header, footer, .sidebar, .ads, .advertisement, 
            .social-share, .comments, .related-articles {
              opacity: 0.1 !important;
              filter: blur(3px) !important;
            }

            /* Enhance main content */
            main, article, .content, .post-content, .article-content {
              opacity: 1 !important;
              filter: none !important;
              max-width: 800px !important;
              margin: 0 auto !important;
              padding: 40px 20px !important;
              background: rgba(255,255,255,0.02) !important;
              border-radius: 12px !important;
            }
          `;
          document.head.appendChild(style);

          // Show toast
          this.showToast("🎯 Focus Mode Activated - Press ESC to exit", 3000);
        }

        deactivate() {
          this.isActive = false;
          this.focusButton.innerHTML = "🎯";
          this.focusButton.style.background =
            "linear-gradient(135deg, #4a5568 0%, #2d3748 100%)";
          this.readingProgress.style.display = "none";

          const focusStyles = document.getElementById(
            "mindcache-focus-mode-styles"
          );
          if (focusStyles) {
            focusStyles.remove();
          }

          this.showToast("👁️ Focus Mode Deactivated", 2000);
        }

        showToast(message, duration = 3000) {
          const toast = document.createElement("div");
          toast.textContent = message;

          Object.assign(toast.style, {
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #4a5568 0%, #2d3748 100%)",
            color: "white",
            padding: "12px 24px",
            borderRadius: "25px",
            zIndex: "10001",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "14px",
            fontWeight: "500",
            animation: "slideInToast 0.3s ease forwards",
          });

          document.body.appendChild(toast);

          setTimeout(() => {
            toast.style.animation = "slideOutToast 0.3s ease forwards";
            setTimeout(() => toast.remove(), 300);
          }, duration);
        }
      }

      window.MindCacheFocusMode = new MindCacheFocusMode();
    }

    // Site Activity Tracker
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
