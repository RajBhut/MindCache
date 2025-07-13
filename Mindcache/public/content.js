// Content script for MindCache extension
(() => {
  "use strict";

  // Avoid multiple injections
  if (window.mindCacheContentScript) {
    return;
  }
  window.mindCacheContentScript = true;

  class ContentTracker {
    constructor() {
      this.setupTracking();
      this.lastScrollTime = 0;
      this.scrollThrottle = 1000; // 1 second throttle
    }

    setupTracking() {
      // Track clicks
      document.addEventListener("click", (event) => {
        this.trackInteraction("click", {
          element: this.getElementInfo(event.target),
          coordinates: { x: event.clientX, y: event.clientY },
        });
      });

      // Track form submissions
      document.addEventListener("submit", (event) => {
        this.trackInteraction("form_submit", {
          form: this.getElementInfo(event.target),
          action: event.target.action || "unknown",
        });
      });

      // Track text selection
      document.addEventListener("mouseup", () => {
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
          this.trackInteraction("text_selection", {
            selectedText: selection.toString().substring(0, 100), // Limit length
            length: selection.toString().length,
          });
        }
      });

      // Track scrolling (throttled)
      document.addEventListener("scroll", () => {
        const now = Date.now();
        if (now - this.lastScrollTime > this.scrollThrottle) {
          this.lastScrollTime = now;
          this.trackInteraction("scroll", {
            scrollY: window.scrollY,
            documentHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight,
            scrollPercentage: Math.round(
              (window.scrollY /
                (document.documentElement.scrollHeight - window.innerHeight)) *
                100
            ),
          });
        }
      });

      // Track time spent on page
      let startTime = Date.now();
      let isVisible = true;

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          if (isVisible) {
            const timeSpent = Date.now() - startTime;
            this.trackInteraction("page_leave", {
              timeSpent: timeSpent,
              url: window.location.href,
            });
            isVisible = false;
          }
        } else {
          startTime = Date.now();
          isVisible = true;
          this.trackInteraction("page_focus", {
            url: window.location.href,
          });
        }
      });

      // Track before page unload
      window.addEventListener("beforeunload", () => {
        if (isVisible) {
          const timeSpent = Date.now() - startTime;
          this.trackInteraction("page_unload", {
            timeSpent: timeSpent,
            url: window.location.href,
          });
        }
      });
    }

    getElementInfo(element) {
      return {
        tagName: element.tagName?.toLowerCase(),
        id: element.id || null,
        className: element.className || null,
        text: element.textContent?.substring(0, 50) || null,
        href: element.href || null,
        type: element.type || null,
      };
    }

    trackInteraction(action, data) {
      try {
        // Check if we're in an extension context
        if (typeof chrome === "undefined" || !chrome.runtime) {
          console.warn("Extension context not available");
          return;
        }

        // Send message to background script using Chrome API
        chrome.runtime.sendMessage(
          {
            type: "user_interaction",
            action: action,
            data: data,
          },
          (response) => {
            // Handle any response or errors
            if (chrome.runtime.lastError) {
              console.error(
                "Message sending failed:",
                chrome.runtime.lastError.message
              );
            }
          }
        );
      } catch (error) {
        console.error("Error tracking interaction:", error);
      }
    }
  }

  // Initialize tracker when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      new ContentTracker();
    });
  } else {
    new ContentTracker();
  }

  console.log("MindCache content script loaded on:", window.location.href);
})();
