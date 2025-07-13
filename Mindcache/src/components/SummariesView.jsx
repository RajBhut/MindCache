import { format } from "date-fns";
import useStore from "../store/useStore";
import { FileText, Clock, Globe, TrendingUp } from "lucide-react";

const SummariesView = () => {
  const { summaries } = useStore();

  const sortedSummaries = [...summaries].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  if (summaries.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Summaries Yet
        </h3>
        <p className="text-gray-600">
          Summaries are automatically generated as you browse. Keep using your
          browser to see interaction summaries here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Interaction Summaries
        </h2>
        <p className="text-gray-600 mb-6">
          Automatically generated summaries of your browsing patterns and
          interactions.
        </p>

        <div className="space-y-4">
          {sortedSummaries.map((summary) => (
            <SummaryCard key={summary.id} summary={summary} />
          ))}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ summary }) => {
  const getDuration = () => {
    if (!summary.timeRange.start || !summary.timeRange.end)
      return "Unknown duration";
    const duration = summary.timeRange.end - summary.timeRange.start;
    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">
            Summary from{" "}
            {format(new Date(summary.timestamp), "MMM d, yyyy HH:mm")}
          </span>
        </div>
        <span className="text-sm text-gray-500">{getDuration()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="text-sm text-gray-600">
            {summary.interactions} interactions
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-gray-600">
            Most active:{" "}
            {summary.activityPattern.mostCommonActivity?.replace("_", " ") ||
              "N/A"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-gray-600">
            {summary.topSites.length} unique sites
          </span>
        </div>
      </div>

      {summary.topSites.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Top Sites Visited:
          </h4>
          <div className="flex flex-wrap gap-2">
            {summary.topSites.slice(0, 5).map((site, index) => (
              <span
                key={site.domain}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
              >
                {site.domain}
                <span className="text-gray-500">({site.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.activityPattern.activityTypes && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Activity Breakdown:
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(summary.activityPattern.activityTypes).map(
              ([type, count]) => (
                <div key={type} className="text-xs">
                  <span className="capitalize text-gray-600">
                    {type.replace("_", " ")}:
                  </span>
                  <span className="font-medium text-gray-900 ml-1">
                    {count}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummariesView;
