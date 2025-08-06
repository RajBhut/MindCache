import { useEffect, useState } from "react";
import { format } from "date-fns";
import useStore from "../store/useStore";
import {
  BarChart3,
  Globe,
  Clock,
  Activity,
  Highlighter,
  FileText,
  Quote,
} from "lucide-react";

const Dashboard = () => {
  const { getStats, interactions, summaries, highlights, notes, quotes } =
    useStore();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setStats(getStats());
  }, [interactions, summaries, highlights, notes, quotes, getStats]);

  if (!stats) {
    return <div className="text-center py-4">Loading stats...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Total"
          value={stats.totalInteractions}
          icon={<Activity className="w-4 h-4" />}
          color="blue"
        />
        <StatCard
          title="Today"
          value={stats.todayInteractions}
          icon={<Clock className="w-4 h-4" />}
          color="green"
        />
        <StatCard
          title="Summaries"
          value={stats.totalSummaries}
          icon={<BarChart3 className="w-4 h-4" />}
          color="purple"
        />
        <StatCard
          title="Sites"
          value={stats.topDomains.length}
          icon={<Globe className="w-4 h-4" />}
          color="orange"
        />
      </div>

      {/* MindCache Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          title="Highlights"
          value={stats.totalHighlights || 0}
          subtitle={`${stats.todayHighlights || 0} today`}
          icon={<Highlighter className="w-4 h-4" />}
          color="yellow"
          compact
        />
        <StatCard
          title="Notes"
          value={stats.totalNotes || 0}
          subtitle={`${stats.todayNotes || 0} today`}
          icon={<FileText className="w-4 h-4" />}
          color="blue"
          compact
        />
        <StatCard
          title="Quotes"
          value={stats.totalQuotes || 0}
          subtitle={`${stats.todayQuotes || 0} today`}
          icon={<Quote className="w-4 h-4" />}
          color="indigo"
          compact
        />
      </div>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Top Websites
          </h3>
          <div className="space-y-2">
            {stats.topDomains.slice(0, 3).map((site, index) => (
              <div
                key={site.domain}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {index + 1}
                    </span>
                  </div>
                  <span className="text-xs text-gray-900 truncate max-w-32">
                    {site.domain}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {site.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Activity Types
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.interactionTypes)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-xs text-gray-900 capitalize">
                    {type.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{
                          width: `${
                            (count /
                              Math.max(
                                ...Object.values(stats.interactionTypes)
                              )) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-6">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {stats.lastUpdated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            Last activity: {format(new Date(stats.lastUpdated), "HH:mm")}
          </p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle, compact }) => {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    indigo: "bg-indigo-500",
  };

  if (compact) {
    return (
      <div className="bg-white p-2 rounded-lg shadow">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-600">{title}</p>
          <div className={`p-1 rounded ${colorClasses[color]} text-white`}>
            {icon}
          </div>
        </div>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white p-3 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600">{title}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]} text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
