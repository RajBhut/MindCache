// Content script fixes and improvements
(() => {
  "use strict";

  // Wait for the main content script to load
  setTimeout(() => {
    if (!window.mindCacheContentScript) {
      console.log("Main content script not loaded yet");
      return;
    }

    // Fix selection toolbar issues
    const originalSetupToolbarEvents =
      ContentTracker.prototype.setupToolbarEvents;
    if (originalSetupToolbarEvents) {
      ContentTracker.prototype.setupToolbarEvents = function (
        toolbar,
        selectedText,
        selection
      ) {
        // Improved event handlers that get fresh selection
        toolbar.querySelector(".save-quote").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          const currentText = currentSelection.toString().trim();
          if (currentText) {
            this.saveQuote(currentText, currentSelection);
            this.showToast("Quote saved!");
          }
          this.hideSelectionToolbar();
        });

        toolbar.querySelector(".add-note").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          const currentText = currentSelection.toString().trim();
          if (currentText) {
            this.showNoteDialog(currentText, currentSelection);
          } else {
            this.hideSelectionToolbar();
          }
        });

        toolbar.querySelector(".highlight").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          if (currentSelection.toString().trim()) {
            this.highlightSelection(currentSelection);
            this.showToast("Text highlighted!");
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
          }
          this.hideSelectionToolbar();
        });

        toolbar.querySelector(".translate").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          const currentText = currentSelection.toString().trim();
          if (currentText) {
            window.open(
              `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(
                currentText
              )}`,
              "_blank"
            );
          }
          this.hideSelectionToolbar();
        });

        toolbar.querySelector(".copy").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentSelection = window.getSelection();
          const currentText = currentSelection.toString().trim();
          if (currentText) {
            navigator.clipboard.writeText(currentText);
            this.showToast("Text copied!");
          }
          this.hideSelectionToolbar();
        });
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

    console.log("MindCache UI enhancements loaded!");
  }, 2000);
})();
