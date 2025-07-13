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
} from "lucide-react";

const InteractionsList = () => {
  const { getFilteredInteractions } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const interactions = useMemo(() => {
    const filters = {};

    if (filterType) filters.type = filterType;
    if (dateRange.start)
      filters.startDate = new Date(dateRange.start).getTime();
    if (dateRange.end) filters.endDate = new Date(dateRange.end).getTime();
    if (searchTerm) filters.domain = searchTerm;

    return getFilteredInteractions(filters)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100); // Limit to 100 for performance
  }, [getFilteredInteractions, searchTerm, filterType, dateRange]);

  const interactionTypes = [
    "page_visit",
    "click",
    "scroll",
    "form_submit",
    "text_selection",
    "tab_switch",
  ];

  const getInteractionIcon = (type) => {
    switch (type) {
      case "page_visit":
        return <ExternalLink className="w-4 h-4" />;
      case "click":
        return <MousePointer className="w-4 h-4" />;
      case "scroll":
        return <Eye className="w-4 h-4" />;
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
      text_selection: "bg-pink-100 text-pink-800",
      tab_switch: "bg-indigo-100 text-indigo-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Web Interactions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

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
          {interactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No interactions found matching your filters.
              </p>
            </div>
          ) : (
            interactions.map((interaction) => (
              <InteractionCard key={interaction.id} interaction={interaction} />
            ))
          )}
        </div>

        {interactions.length >= 100 && (
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

const InteractionCard = ({ interaction }) => {
  const getInteractionIcon = (type) => {
    switch (type) {
      case "page_visit":
        return <ExternalLink className="w-4 h-4" />;
      case "click":
        return <MousePointer className="w-4 h-4" />;
      case "scroll":
        return <Eye className="w-4 h-4" />;
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

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">
            {getInteractionIcon(interaction.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                  interaction.type
                )}`}
              >
                {interaction.type.replace("_", " ")}
              </span>
              <span className="text-xs text-gray-500">
                {format(new Date(interaction.timestamp), "MMM d, HH:mm:ss")}
              </span>
            </div>

            {interaction.data.url && (
              <p className="text-sm text-gray-900 truncate">
                {getDomain(interaction.data.url)}
              </p>
            )}

            {interaction.data.title && (
              <p className="text-xs text-gray-600 truncate mt-1">
                {interaction.data.title}
              </p>
            )}

            {interaction.data.selectedText && (
              <p className="text-xs text-gray-600 mt-1 italic">
                Selected: "{interaction.data.selectedText.substring(0, 100)}..."
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractionsList;
