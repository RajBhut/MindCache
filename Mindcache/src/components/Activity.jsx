import React, { useState, useEffect } from "react";
import {
  Activity as ActivityIcon,
  MousePointer,
  Scroll,
  Clock,
  Target,
  BarChart3,
  Eye,
  RefreshCw,
  TrendingUp,
  Calendar,
  Globe,
} from "lucide-react";

const Activity = () => {
  const [activityData, setActivityData] = useState(null);
  const [allSitesData, setAllSitesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState("all");

  useEffect(() => {
    loadActivityData();
    const interval = setInterval(loadActivityData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadActivityData = async () => {
    try {
      // Get current tab info
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentDomain = tabs[0] ? new URL(tabs[0].url).hostname : null;

      // Load all sites activity data
      const allSites = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("mindcache-activity-")) {
          const domain = key.replace("mindcache-activity-", "");
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          allSites.push({ domain, ...data });
        }
      }

      setAllSitesData(
        allSites.sort((a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0))
      );

      // Set current domain data if available
      if (currentDomain) {
        const currentData = allSites.find(
          (site) => site.domain === currentDomain
        );
        if (currentData) {
          setActivityData(currentData);
        }
      }
    } catch (error) {
      console.error("Error loading activity data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getEngagementColor = (score) => {
    if (score >= 75) return "#48bb78";
    if (score >= 50) return "#ed8936";
    return "#e53e3e";
  };

  const getActivityTypeIcon = (type) => {
    switch (type) {
      case "meaningful_scroll":
        return <Scroll className="w-4 h-4" />;
      case "meaningful_click":
        return <MousePointer className="w-4 h-4" />;
      case "text_selection":
        return <Target className="w-4 h-4" />;
      case "page_visit":
        return <Globe className="w-4 h-4" />;
      case "content_hover":
        return <Eye className="w-4 h-4" />;
      default:
        return <ActivityIcon className="w-4 h-4" />;
    }
  };

  const getActivityTypeColor = (type) => {
    const colors = {
      meaningful_scroll: "#667eea",
      meaningful_click: "#764ba2",
      text_selection: "#f093fb",
      page_visit: "#4facfe",
      content_hover: "#43e97b",
      navigation_key: "#fa709a",
      form_interaction: "#fee140",
    };
    return colors[type] || "#a0aec0";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading activity data...</span>
      </div>
    );
  }

  const displayData =
    selectedDomain === "all"
      ? allSitesData[0]
      : allSitesData.find((site) => site.domain === selectedDomain);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ActivityIcon className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-800">Activity Tracking</h2>
        </div>
        <button
          onClick={loadActivityData}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Domain Selector */}
      {allSitesData.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Select Domain:
          </label>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Latest Activity</option>
            {allSitesData.map((site) => (
              <option key={site.domain} value={site.domain}>
                {site.domain}
              </option>
            ))}
          </select>
        </div>
      )}

      {displayData ? (
        <>
          {/* Activity Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Scroll className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Meaningful Scrolls
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {displayData.scrollBehavior?.meaningfulScrolls || 0}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {Math.round(
                  (displayData.scrollBehavior?.totalScrolled || 0) / 1000
                )}
                k px scrolled
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <MousePointer className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  Meaningful Clicks
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                {displayData.clickPatterns?.meaningfulClicks || 0}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                of {displayData.clickPatterns?.totalClicks || 0} total clicks
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Session Duration
                </span>
              </div>
              <div className="text-2xl font-bold text-green-900 mt-1">
                {formatDuration(displayData.sessionDuration || 0)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                Active session time
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Engagement
                </span>
              </div>
              <div className="text-2xl font-bold text-orange-900 mt-1">
                {calculateEngagementScore(displayData)}%
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Overall activity score
              </div>
            </div>
          </div>

          {/* Click Types Distribution */}
          {displayData.clickPatterns?.clickTypes &&
            Object.keys(displayData.clickPatterns.clickTypes).length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Click Distribution
                </h3>
                <div className="space-y-2">
                  {Object.entries(displayData.clickPatterns.clickTypes).map(
                    ([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-600 capitalize">
                          {type}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div
                            className="bg-blue-500 h-2 rounded"
                            style={{
                              width: `${
                                (count /
                                  Math.max(
                                    ...Object.values(
                                      displayData.clickPatterns.clickTypes
                                    )
                                  )) *
                                100
                              }px`,
                              minWidth: "20px",
                            }}
                          />
                          <span className="text-sm font-medium text-gray-800">
                            {count}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Recent Activities */}
          {displayData.activities && displayData.activities.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Recent Activities
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {displayData.activities
                  .slice(-10)
                  .reverse()
                  .map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <div
                        className="p-1 rounded-full"
                        style={{
                          backgroundColor: `${getActivityTypeColor(
                            activity.type
                          )}20`,
                        }}
                      >
                        {getActivityTypeIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800 capitalize">
                            {activity.type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {activity.data && (
                          <div className="text-xs text-gray-600 mt-1">
                            {activity.type === "meaningful_scroll" &&
                              `Scrolled ${activity.data.scrollDelta}px ${activity.data.direction}`}
                            {activity.type === "meaningful_click" &&
                              activity.data.textContent &&
                              `Clicked: "${activity.data.textContent.substring(
                                0,
                                30
                              )}..."`}
                            {activity.type === "text_selection" &&
                              `Selected: "${activity.data.selectedText.substring(
                                0,
                                40
                              )}..."`}
                            {activity.type === "page_visit" &&
                              `Visited: ${
                                activity.data.title || activity.data.url
                              }`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Domain Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Domain: {displayData.domain}
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                Total Activities:{" "}
                <span className="font-medium">
                  {displayData.activities?.length || 0}
                </span>
              </div>
              <div>
                Last Update:{" "}
                <span className="font-medium">
                  {displayData.lastUpdate
                    ? new Date(displayData.lastUpdate).toLocaleString()
                    : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <ActivityIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Activity Data
          </h3>
          <p className="text-gray-600">
            Browse some pages to start tracking your reading activity and
            engagement patterns.
          </p>
        </div>
      )}

      {/* All Sites Overview */}
      {allSitesData.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            All Sites Overview
          </h3>
          <div className="space-y-2">
            {allSitesData.slice(0, 5).map((site, index) => (
              <div
                key={site.domain}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-800">{site.domain}</div>
                  <div className="text-xs text-gray-600">
                    {site.activities?.length || 0} activities •{" "}
                    {formatDuration(site.sessionDuration || 0)}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-sm font-medium"
                    style={{
                      color: getEngagementColor(calculateEngagementScore(site)),
                    }}
                  >
                    {calculateEngagementScore(site)}%
                  </div>
                  <div className="text-xs text-gray-500">engagement</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to calculate engagement score
const calculateEngagementScore = (data) => {
  if (!data) return 0;

  const sessionMinutes = (data.sessionDuration || 0) / 60000;
  const scrollScore =
    Math.min((data.scrollBehavior?.meaningfulScrolls || 0) / 10, 1) * 25;
  const clickScore =
    Math.min((data.clickPatterns?.meaningfulClicks || 0) / 5, 1) * 25;
  const timeScore = Math.min(sessionMinutes / 5, 1) * 25;
  const interactionScore =
    Math.min((data.activities?.length || 0) / 50, 1) * 25;

  return Math.round(scrollScore + clickScore + timeScore + interactionScore);
};

export default Activity;
