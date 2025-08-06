import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import useStore from "../store/useStore";
import {
  Search,
  Filter,
  Globe,
  Highlighter,
  FileText,
  Quote,
  Calendar,
  ExternalLink,
  Copy,
  Trash2,
} from "lucide-react";

const MindCacheView = () => {
  const { highlights, notes, quotes } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
  const [currentUrl, setCurrentUrl] = useState("");

  // Get current tab URL
  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab?.url) {
          const domain = new URL(tab.url).hostname;
          setCurrentUrl(domain);
        }
      } catch (error) {
        console.error("Error getting current tab:", error);
      }
    };

    if (typeof chrome !== "undefined" && chrome.tabs) {
      getCurrentTab();
    }
  }, []);

  // Get all unique domains
  const allDomains = useMemo(() => {
    const domains = new Set();
    [...highlights, ...notes, ...quotes].forEach((item) => {
      if (item.domain) domains.add(item.domain);
    });
    return Array.from(domains).sort();
  }, [highlights, notes, quotes]);

  // Filter and combine all items
  const filteredItems = useMemo(() => {
    let items = [];

    // Add items based on type filter
    if (!filterType || filterType === "highlight") {
      items = [
        ...items,
        ...highlights.map((item) => ({ ...item, itemType: "highlight" })),
      ];
    }
    if (!filterType || filterType === "note") {
      items = [
        ...items,
        ...notes.map((item) => ({ ...item, itemType: "note" })),
      ];
    }
    if (!filterType || filterType === "quote") {
      items = [
        ...items,
        ...quotes.map((item) => ({ ...item, itemType: "quote" })),
      ];
    }

    // Filter by current page
    if (currentTab === "current" && currentUrl) {
      items = items.filter((item) => item.domain === currentUrl);
    }

    // Filter by domain
    if (filterDomain) {
      items = items.filter((item) => item.domain === filterDomain);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          item.text?.toLowerCase().includes(term) ||
          item.content?.toLowerCase().includes(term) ||
          item.note?.toLowerCase().includes(term) ||
          item.title?.toLowerCase().includes(term) ||
          item.domain?.toLowerCase().includes(term)
      );
    }

    // Sort by timestamp (newest first)
    return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [
    highlights,
    notes,
    quotes,
    filterType,
    filterDomain,
    searchTerm,
    currentTab,
    currentUrl,
  ]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  const getItemIcon = (type) => {
    switch (type) {
      case "highlight":
        return <Highlighter className="w-4 h-4 text-yellow-600" />;
      case "note":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "quote":
        return <Quote className="w-4 h-4 text-indigo-600" />;
      default:
        return null;
    }
  };

  const getItemColor = (type) => {
    switch (type) {
      case "highlight":
        return "border-l-yellow-500 bg-yellow-50";
      case "note":
        return "border-l-blue-500 bg-blue-50";
      case "quote":
        return "border-l-indigo-500 bg-indigo-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">MindCache</h2>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCurrentTab("all")}
            className={`px-3 py-1 text-xs rounded-full ${
              currentTab === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All Sites
          </button>
          <button
            onClick={() => setCurrentTab("current")}
            className={`px-3 py-1 text-xs rounded-full ${
              currentTab === "current"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Current Page {currentUrl && `(${currentUrl})`}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="highlight">Highlights</option>
            <option value="note">Notes</option>
            <option value="quote">Quotes</option>
          </select>

          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Domains</option>
            {allDomains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4 text-sm text-gray-600">
          <span>Total: {filteredItems.length}</span>
          <span>
            Highlights:{" "}
            {filteredItems.filter((i) => i.itemType === "highlight").length}
          </span>
          <span>
            Notes: {filteredItems.filter((i) => i.itemType === "note").length}
          </span>
          <span>
            Quotes: {filteredItems.filter((i) => i.itemType === "quote").length}
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <FileText className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500">
              {currentTab === "current"
                ? "No MindCache items found for this page"
                : "No MindCache items found"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Start highlighting text or adding notes to see them here
            </p>
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <MindCacheCard key={`${item.itemType}-${index}`} item={item} />
          ))
        )}
      </div>
    </div>
  );
};

const MindCacheCard = ({ item }) => {
  const getItemIcon = (type) => {
    switch (type) {
      case "highlight":
        return <Highlighter className="w-4 h-4 text-yellow-600" />;
      case "note":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "quote":
        return <Quote className="w-4 h-4 text-indigo-600" />;
      default:
        return null;
    }
  };

  const getItemColor = (type) => {
    switch (type) {
      case "highlight":
        return "border-l-yellow-500 bg-yellow-50";
      case "note":
        return "border-l-blue-500 bg-blue-50";
      case "quote":
        return "border-l-indigo-500 bg-indigo-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const openSource = () => {
    if (item.url) {
      chrome.tabs.create({ url: item.url });
    }
  };

  return (
    <div
      className={`border-l-4 p-4 rounded-r-lg ${getItemColor(item.itemType)}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-1">{getItemIcon(item.itemType)}</div>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-gray-900 capitalize">
                {item.itemType}
              </span>
              <span className="text-xs text-gray-500">
                {format(new Date(item.timestamp), "MMM d, HH:mm")}
              </span>
              {item.domain && (
                <span className="text-xs text-gray-500 truncate">
                  {item.domain}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              {item.title && (
                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                  {item.title}
                </p>
              )}

              {item.text && (
                <p className="text-sm text-gray-700 line-clamp-3">
                  "{item.text}"
                </p>
              )}

              {item.content && (
                <p className="text-sm text-gray-700 line-clamp-3">
                  {item.content}
                </p>
              )}

              {item.note && item.itemType === "highlight" && (
                <p className="text-sm text-blue-700 italic line-clamp-2">
                  Note: {item.note}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-3">
          <button
            onClick={() => copyToClipboard(item.text || item.content || "")}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy content"
          >
            <Copy className="w-4 h-4" />
          </button>
          {item.url && (
            <button
              onClick={openSource}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Open source page"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MindCacheView;
