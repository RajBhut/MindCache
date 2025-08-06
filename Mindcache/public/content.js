// Utility for safe message sending
class MessageHandler {
  static async sendMessage(message, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === "undefined" || !chrome.runtime) {
        reject(new Error("Extension context not available"));
        return;
      }

      let responded = false;

      const timeoutId = setTimeout(() => {
        if (!responded) {
          responded = true;
          reject(new Error("Message timeout"));
        }
      }, timeout);

      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (responded) return;
          responded = true;
          clearTimeout(timeoutId);

          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError.message;
            // Don't reject for common disconnection errors
            if (
              error.includes("message channel closed") ||
              error.includes("Extension context invalidated") ||
              error.includes("receiving end does not exist")
            ) {
              resolve({ success: false, error: "disconnected" });
            } else {
              reject(new Error(error));
            }
          } else {
            resolve(response || { success: true });
          }
        });
      } catch (error) {
        if (!responded) {
          responded = true;
          clearTimeout(timeoutId);
          reject(error);
        }
      }
    });
  }
}

// Enhanced Content script for MindCache extension
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
      this.readingData = {
        visibleText: new Set(),
        readingTime: 0,
        focusTime: 0,
        keyInteractions: [],
      };
      this.contentObserver = null;
      this.readingAnalyzer = new ReadingAnalyzer();
      this.setupContentObservation();
    }

    setupTracking() {
      // Track meaningful clicks only
      document.addEventListener("click", (event) => {
        const clickData = this.analyzeClick(event);
        if (clickData.isSignificant) {
          this.trackInteraction("meaningful_click", clickData);
        }
      });

      // Track form submissions
      document.addEventListener("submit", (event) => {
        this.trackInteraction("form_submit", {
          form: this.getElementInfo(event.target),
          action: event.target.action || "unknown",
          formData: this.extractFormData(event.target),
        });
      });

      // Track meaningful text selection
      document.addEventListener("mouseup", () => {
        const selection = window.getSelection();
        if (selection.toString().length > 10) {
          // Only meaningful selections
          const selectedText = selection.toString().trim();
          this.trackInteraction("content_selection", {
            selectedText: selectedText.substring(0, 200),
            length: selectedText.length,
            context: this.getSelectionContext(selection),
          });
        }
      });

      // Enhanced scrolling with reading detection
      document.addEventListener("scroll", () => {
        const now = Date.now();
        if (now - this.lastScrollTime > this.scrollThrottle) {
          this.lastScrollTime = now;
          this.analyzeScrollReading();
        }
      });

      // Track reading behavior
      this.setupReadingTracking();

      // Track meaningful page navigation
      this.setupNavigationTracking();
    }

    setupContentObservation() {
      // Observe when new content becomes visible
      this.contentObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.readingAnalyzer.addVisibleContent(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );

      // Observe all text content
      this.observeTextContent();
    }

    observeTextContent() {
      const textElements = document.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, article, section, main, .content, .article, .post"
      );
      textElements.forEach((element) => {
        if (element.textContent.trim().length > 50) {
          this.contentObserver.observe(element);
        }
      });
    }

    analyzeClick(event) {
      const element = event.target;
      const elementInfo = this.getElementInfo(element);

      // Determine if click is significant
      const isSignificant = this.isSignificantClick(element, elementInfo);

      return {
        isSignificant,
        element: elementInfo,
        coordinates: { x: event.clientX, y: event.clientY },
        context: this.getClickContext(element),
        timestamp: Date.now(),
      };
    }

    isSignificantClick(element, elementInfo) {
      // Skip clicks on empty areas, decorative elements
      if (
        !elementInfo.text &&
        !elementInfo.href &&
        elementInfo.tagName !== "button" &&
        elementInfo.tagName !== "input"
      ) {
        return false;
      }

      // Skip navigation elements that aren't meaningful
      const skipElements = ["nav", "header", "footer"];
      if (skipElements.includes(elementInfo.tagName)) {
        return false;
      }

      // Skip if clicking on whitespace or very short text
      if (elementInfo.text && elementInfo.text.trim().length < 3) {
        return false;
      }

      // Include meaningful interactions
      return (
        elementInfo.href || // Links
        elementInfo.tagName === "button" || // Buttons
        elementInfo.tagName === "input" || // Form inputs
        (elementInfo.text && elementInfo.text.trim().length > 5) || // Meaningful text
        element.closest("article, .content, .post, main")
      ); // Content areas
    }

    getClickContext(element) {
      const parent = element.closest("article, section, .content, .post, main");
      return {
        inContentArea: !!parent,
        sectionTitle: parent
          ?.querySelector("h1, h2, h3")
          ?.textContent?.substring(0, 100),
        nearbyText: this.getNearbyText(element),
        elementType: this.classifyElement(element),
      };
    }

    setupReadingTracking() {
      let focusStartTime = Date.now();
      let isPageVisible = !document.hidden;

      // Track focus time
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && isPageVisible) {
          this.readingData.focusTime += Date.now() - focusStartTime;
          this.generateReadingSession();
          isPageVisible = false;
        } else if (!document.hidden && !isPageVisible) {
          focusStartTime = Date.now();
          isPageVisible = true;
        }
      });

      // Track mouse movement for reading engagement
      let lastMouseMove = 0;
      document.addEventListener("mousemove", () => {
        const now = Date.now();
        if (now - lastMouseMove > 2000) {
          // Every 2 seconds
          this.readingAnalyzer.recordEngagement();
          lastMouseMove = now;
        }
      });

      // Track beforeunload with reading data
      window.addEventListener("beforeunload", () => {
        if (isPageVisible) {
          this.readingData.focusTime += Date.now() - focusStartTime;
        }
        this.generateReadingSession();
      });
    }

    setupNavigationTracking() {
      // Only track meaningful navigation
      let startTime = Date.now();
      let hasSignificantActivity = false;

      // Mark significant activity
      document.addEventListener("click", () => {
        hasSignificantActivity = true;
      });
      document.addEventListener("scroll", () => {
        hasSignificantActivity = true;
      });
      document.addEventListener("keydown", () => {
        hasSignificantActivity = true;
      });

      window.addEventListener("beforeunload", () => {
        const timeSpent = Date.now() - startTime;

        // Only track if user spent meaningful time or had significant activity
        if (timeSpent > 5000 || hasSignificantActivity) {
          this.trackInteraction("page_session", {
            timeSpent,
            url: window.location.href,
            title: document.title,
            readingData: this.readingData,
            contentSummary: this.generateContentSummary(),
            hasSignificantActivity,
          });
        }
      });
    }

    analyzeScrollReading() {
      const visibleText = this.getVisibleText();
      const scrollData = {
        scrollY: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        scrollPercentage: Math.round(
          (window.scrollY /
            (document.documentElement.scrollHeight - window.innerHeight)) *
            100
        ),
        visibleContent: visibleText.substring(0, 500),
        readingProgress: this.calculateReadingProgress(),
      };

      // Only track meaningful scroll events
      if (scrollData.scrollPercentage % 25 === 0 || visibleText.length > 100) {
        this.trackInteraction("reading_scroll", scrollData);
      }
    }

    getVisibleText() {
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      const scrollBottom = scrollTop + viewportHeight;

      let visibleText = "";
      const textElements = document.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, li, article"
      );

      textElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + scrollTop;
        const elementBottom = elementTop + rect.height;

        if (elementTop < scrollBottom && elementBottom > scrollTop) {
          visibleText += element.textContent + " ";
        }
      });

      return visibleText.trim();
    }

    extractFormData(form) {
      const formData = new FormData(form);
      const data = {};

      // Only extract non-sensitive data
      for (let [key, value] of formData.entries()) {
        // Skip password and sensitive fields
        if (
          !key.toLowerCase().includes("password") &&
          !key.toLowerCase().includes("ssn") &&
          !key.toLowerCase().includes("credit")
        ) {
          data[key] =
            typeof value === "string" ? value.substring(0, 100) : value;
        }
      }

      return data;
    }

    getSelectionContext(selection) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const parent =
        container.nodeType === Node.TEXT_NODE
          ? container.parentElement
          : container;

      return {
        containerTag: parent.tagName?.toLowerCase(),
        sectionTitle: parent
          .closest("article, section")
          ?.querySelector("h1, h2, h3")
          ?.textContent?.substring(0, 100),
        surroundingText: parent.textContent?.substring(0, 200),
      };
    }

    getNearbyText(element) {
      const parent = element.parentElement;
      if (parent) {
        return parent.textContent?.substring(0, 100) || "";
      }
      return "";
    }

    classifyElement(element) {
      if (element.tagName === "A") return "link";
      if (element.tagName === "BUTTON") return "button";
      if (element.tagName === "INPUT") return "input";
      if (element.closest("nav")) return "navigation";
      if (element.closest("article, .content, .post")) return "content";
      if (element.closest("header")) return "header";
      if (element.closest("footer")) return "footer";
      return "other";
    }

    calculateReadingProgress() {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      return Math.round(progress);
    }

    generateContentSummary() {
      const title = document.title;
      const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
        .slice(0, 5)
        .map((h) => h.textContent.trim())
        .filter((text) => text.length > 5);

      const mainContent = this.extractMainContent();
      const links = Array.from(document.querySelectorAll("a[href]"))
        .slice(0, 10)
        .map((a) => ({
          text: a.textContent.trim().substring(0, 50),
          href: a.href,
        }))
        .filter((link) => link.text.length > 3);

      return {
        title,
        headings,
        contentPreview: mainContent.substring(0, 500),
        wordCount: mainContent.split(/\s+/).length,
        links,
        domain: window.location.hostname,
        contentType: this.detectContentType(),
      };
    }

    extractMainContent() {
      // Try to find main content area
      const selectors = [
        "article",
        "main",
        ".content",
        ".post",
        ".article",
        "#content",
        "#main",
        '[role="main"]',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent.trim();
        }
      }

      // Fallback to body content, excluding nav/header/footer
      const body = document.body.cloneNode(true);
      const excludeElements = body.querySelectorAll(
        "nav, header, footer, script, style"
      );
      excludeElements.forEach((el) => el.remove());

      return body.textContent.trim();
    }

    detectContentType() {
      const url = window.location.href.toLowerCase();
      const title = document.title.toLowerCase();

      if (
        url.includes("blog") ||
        url.includes("article") ||
        url.includes("post")
      )
        return "article";
      if (url.includes("news")) return "news";
      if (
        url.includes("video") ||
        url.includes("watch") ||
        url.includes("youtube")
      )
        return "video";
      if (url.includes("shop") || url.includes("store") || url.includes("buy"))
        return "shopping";
      if (url.includes("search") || url.includes("results")) return "search";
      if (title.includes("login") || title.includes("sign in")) return "auth";

      return "webpage";
    }

    generateReadingSession() {
      if (this.readingData.focusTime > 3000) {
        this.trackInteraction("reading_session", {
          focusTime: this.readingData.focusTime,
          contentSummary: this.generateContentSummary(),
          readingAnalysis: this.readingAnalyzer.getAnalysis(),
          timestamp: Date.now(),
        });
      }
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
        // Enhanced data structure for AI analysis
        const enrichedData = {
          ...data,
          url: window.location.href,
          title: document.title,
          timestamp: Date.now(),
          userAgent: navigator.userAgent.substring(0, 100),
          viewportSize: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          documentSize: {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
          },
        };

        const message = {
          type: "user_interaction",
          action: action,
          data: enrichedData,
        };

        // Use the safe message handler
        MessageHandler.sendMessage(message)
          .then((response) => {
            // Successfully sent
            if (
              response &&
              !response.success &&
              response.error !== "disconnected"
            ) {
              console.warn("Background script reported error:", response);
            }
          })
          .catch((error) => {
            // Only log unexpected errors
            console.error("Error tracking interaction:", error.message);
          });
      } catch (error) {
        console.error("Error tracking interaction:", error);
      }
    }
  }

  // Reading Analyzer class for intelligent content analysis
  class ReadingAnalyzer {
    constructor() {
      this.visibleElements = new Set();
      this.engagementEvents = [];
      this.readingPatterns = {
        fastScroll: 0,
        slowScroll: 0,
        backtrack: 0,
        deepRead: 0,
      };
      this.lastScrollPosition = 0;
      this.lastScrollTime = Date.now();
    }

    addVisibleContent(element) {
      const text = element.textContent.trim();
      if (text.length > 20) {
        this.visibleElements.add({
          element: element.tagName,
          text: text.substring(0, 200),
          timestamp: Date.now(),
          position: element.getBoundingClientRect(),
        });
      }
    }

    recordEngagement() {
      const now = Date.now();
      const scrollSpeed =
        Math.abs(window.scrollY - this.lastScrollPosition) /
        (now - this.lastScrollTime);

      if (scrollSpeed > 5) {
        this.readingPatterns.fastScroll++;
      } else if (scrollSpeed > 0) {
        this.readingPatterns.slowScroll++;
      }

      if (window.scrollY < this.lastScrollPosition) {
        this.readingPatterns.backtrack++;
      }

      this.lastScrollPosition = window.scrollY;
      this.lastScrollTime = now;

      this.engagementEvents.push({
        type: "engagement",
        scrollY: window.scrollY,
        timestamp: now,
        scrollSpeed,
      });
    }

    getAnalysis() {
      return {
        visibleContentCount: this.visibleElements.size,
        engagementEvents: this.engagementEvents.length,
        readingPatterns: this.readingPatterns,
        estimatedReadingTime: this.estimateReadingTime(),
        engagementScore: this.calculateEngagementScore(),
      };
    }

    estimateReadingTime() {
      const totalWords = Array.from(this.visibleElements).reduce(
        (total, item) => total + item.text.split(/\s+/).length,
        0
      );
      return Math.round((totalWords / 200) * 60); // Assuming 200 words per minute
    }

    calculateEngagementScore() {
      const { fastScroll, slowScroll, backtrack, deepRead } =
        this.readingPatterns;
      const total = fastScroll + slowScroll + backtrack + deepRead;

      if (total === 0) return 0;

      // Higher score for slower, more deliberate reading
      return Math.round(
        ((slowScroll * 2 + backtrack + deepRead * 3) / total) * 100
      );
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
