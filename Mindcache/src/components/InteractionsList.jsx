import { useState, useMemo } from "react";
import { format } from "date-fns";
import useStore from "../store/useStore";
import {
  Search,
  Filter,
  ExternalLink,
  Clock,
  MousePointer,
  Eye,
  Highlighter,
  FileText,
  Quote,
} from "lucide-react";

const InteractionsList = () => {
  const { getFilteredInteractions, highlights, notes, quotes } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [viewMode, setViewMode] = useState("all"); // all, interactions, mindcache

  // Combine all data types
  const allItems = useMemo(() => {
    let items = [];

    // Add interactions
    if (viewMode === "all" || viewMode === "interactions") {
      const filters = {};
      if (
        filterType &&
        filterType !== "highlight" &&
        filterType !== "note" &&
        filterType !== "quote"
      ) {
        filters.type = filterType;
      }
      if (dateRange.start)
        filters.startDate = new Date(dateRange.start).getTime();
      if (dateRange.end) filters.endDate = new Date(dateRange.end).getTime();
      if (searchTerm) filters.domain = searchTerm;

      const interactions = getFilteredInteractions(filters).map((item) => ({
        ...item,
        itemType: "interaction",
      }));
      items = [...items, ...interactions];
    }

    // Add MindCache items
    if (viewMode === "all" || viewMode === "mindcache") {
      const mindcacheItems = [
        ...highlights.map((item) => ({
          ...item,
          itemType: "highlight",
          type: "highlight",
        })),
        ...notes.map((item) => ({ ...item, itemType: "note", type: "note" })),
        ...quotes.map((item) => ({
          ...item,
          itemType: "quote",
          type: "quote",
        })),
      ];

      // Filter MindCache items
      let filteredMindCache = mindcacheItems;

      if (
        filterType &&
        (filterType === "highlight" ||
          filterType === "note" ||
          filterType === "quote")
      ) {
        filteredMindCache = filteredMindCache.filter(
          (item) => item.type === filterType
        );
      }

      if (searchTerm) {
        filteredMindCache = filteredMindCache.filter(
          (item) =>
            item.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.content?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (dateRange.start || dateRange.end) {
        filteredMindCache = filteredMindCache.filter((item) => {
          const itemDate = new Date(item.timestamp);
          const start = dateRange.start ? new Date(dateRange.start) : null;
          const end = dateRange.end ? new Date(dateRange.end) : null;

          if (start && itemDate < start) return false;
          if (end && itemDate > end) return false;
          return true;
        });
      }

      items = [...items, ...filteredMindCache];
    }

    // Sort by timestamp (most recent first)
    return items
      .sort((a, b) => {
        const timeA =
          a.itemType === "interaction"
            ? a.timestamp
            : new Date(a.timestamp).getTime();
        const timeB =
          b.itemType === "interaction"
            ? b.timestamp
            : new Date(b.timestamp).getTime();
        return timeB - timeA;
      })
      .slice(0, 100); // Limit to 100 for performance
  }, [
    getFilteredInteractions,
    highlights,
    notes,
    quotes,
    searchTerm,
    filterType,
    dateRange,
    viewMode,
  ]);

  const interactionTypes = [
    "page_visit",
    "click",
    "scroll",
    "form_submit",
    "text_selection",
    "tab_switch",
    "highlight",
    "note",
    "quote",
  ];

  const getInteractionIcon = (type) => {
    switch (type) {
      case "page_visit":
        return <ExternalLink className="w-4 h-4" />;
      case "click":
        return <MousePointer className="w-4 h-4" />;
      case "scroll":
        return <Eye className="w-4 h-4" />;
      case "highlight":
        return <Highlighter className="w-4 h-4" />;
      case "note":
        return <FileText className="w-4 h-4" />;
      case "quote":
        return <Quote className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      page_visit: "bg-blue-100 text-blue-800",
      click: "bg-green-100 text-green-800",
      scroll: "bg-yellow-100 text-yellow-800",
      form_submit: "bg-purple-100 text-purple-800",
      highlight: "bg-yellow-100 text-yellow-800",
      note: "bg-blue-100 text-blue-800",
      quote: "bg-indigo-100 text-indigo-800",
      text_selection: "bg-pink-100 text-pink-800",
      tab_switch: "bg-indigo-100 text-indigo-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          All Activity
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Activity</option>
            <option value="interactions">Web Interactions</option>
            <option value="mindcache">MindCache Items</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            {interactionTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, start: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, end: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-3">
          {allItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No items found matching your filters.
              </p>
            </div>
          ) : (
            allItems.map((item) => (
              <ItemCard
                key={`${item.itemType}-${item.id || item.timestamp}`}
                item={item}
              />
            ))
          )}
        </div>

        {allItems.length >= 100 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Showing first 100 results. Use filters to narrow down your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ItemCard = ({ item }) => {
  const getInteractionIcon = (type) => {
    switch (type) {
      case "page_visit":
        return <ExternalLink className="w-4 h-4" />;
      case "click":
        return <MousePointer className="w-4 h-4" />;
      case "scroll":
        return <Eye className="w-4 h-4" />;
      case "highlight":
        return <Highlighter className="w-4 h-4" />;
      case "note":
        return <FileText className="w-4 h-4" />;
      case "quote":
        return <Quote className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      page_visit: "bg-blue-100 text-blue-800",
      click: "bg-green-100 text-green-800",
      scroll: "bg-yellow-100 text-yellow-800",
      form_submit: "bg-purple-100 text-purple-800",
      highlight: "bg-yellow-100 text-yellow-800",
      note: "bg-blue-100 text-blue-800",
      quote: "bg-indigo-100 text-indigo-800",
      text_selection: "bg-pink-100 text-pink-800",
      tab_switch: "bg-indigo-100 text-indigo-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getDomain = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date =
      item.itemType === "interaction"
        ? new Date(timestamp)
        : new Date(timestamp);
    return format(date, "MMM d, HH:mm:ss");
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">
            {getInteractionIcon(item.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                  item.type
                )}`}
              >
                {item.type.replace("_", " ")}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>

            {/* For interactions */}
            {item.itemType === "interaction" && (
              <>
                {item.data.url && (
                  <p className="text-sm text-gray-900 truncate">
                    {getDomain(item.data.url)}
                  </p>
                )}

                {item.data.title && (
                  <p className="text-xs text-gray-600 truncate mt-1">
                    {item.data.title}
                  </p>
                )}

                {item.data.selectedText && (
                  <p className="text-xs text-gray-600 mt-1 italic">
                    Selected: "{item.data.selectedText.substring(0, 100)}..."
                  </p>
                )}
              </>
            )}

            {/* For MindCache items */}
            {(item.itemType === "highlight" ||
              item.itemType === "note" ||
              item.itemType === "quote") && (
              <>
                <p className="text-sm text-gray-900 truncate">
                  {item.domain || "Unknown site"}
                </p>

                {item.title && (
                  <p className="text-xs text-gray-600 truncate mt-1">
                    {item.title}
                  </p>
                )}

                {(item.text || item.content) && (
                  <p className="text-xs text-gray-600 mt-1">
                    {item.itemType === "highlight" &&
                      `"${(item.text || "").substring(0, 100)}..."`}
                    {item.itemType === "note" &&
                      `Note: ${(item.content || "").substring(0, 100)}...`}
                    {item.itemType === "quote" &&
                      `"${(item.text || "").substring(0, 100)}..."`}
                  </p>
                )}

                {item.note && item.itemType === "highlight" && (
                  <p className="text-xs text-blue-600 mt-1 italic">
                    Note: {item.note.substring(0, 80)}...
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractionsList;
