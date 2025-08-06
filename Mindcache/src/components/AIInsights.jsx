import React, { useState, useEffect } from "react";
import { Brain, TrendingUp, Eye, Clock, Target, BarChart3 } from "lucide-react";

const AIInsights = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);

      // First try to load from backend
      try {
        const response = await fetch("http://localhost:5000/api/insights");
        if (response.ok) {
          const backendInsights = await response.json();
          console.log("Backend insights loaded:", backendInsights);

          // Convert backend format to component format
          const formattedInsights = [
            {
              id: Date.now(),
              type: "backend_analysis",
              content_analysis: {
                sentiment: {
                  polarity:
                    backendInsights.sentiment_analysis?.average_sentiment || 0,
                  subjectivity: 0.5,
                },
                topics: backendInsights.content_analysis?.top_topics || [],
                complexity:
                  backendInsights.content_analysis?.complexity_score || 0,
              },
              behavior_analysis: {
                engagement_level:
                  backendInsights.behavior_patterns?.engagement_score || 0,
                reading_speed:
                  backendInsights.behavior_patterns?.reading_speed || 0,
                focus_time:
                  backendInsights.behavior_patterns?.focus_duration || 0,
              },
              patterns: backendInsights.behavior_patterns || {},
              timestamp: new Date().toISOString(),
            },
          ];

          setInsights(formattedInsights);
          generateStats(formattedInsights);
          setLoading(false);
          return;
        }
      } catch (backendError) {
        console.log(
          "Backend not available, loading from local storage:",
          backendError.message
        );
      }

      // Fallback to Chrome storage
      const result = await chrome.storage.local.get(["ai_insights"]);
      const aiInsights = result.ai_insights || [];

      if (aiInsights.length === 0) {
        // Generate sample insights if none exist
        const sampleInsights = generateSampleInsights();
        setInsights(sampleInsights);
        generateStats(sampleInsights);
      } else {
        setInsights(aiInsights.slice(-10)); // Show last 10 insights
        generateStats(aiInsights);
      }
    } catch (error) {
      console.error("Error loading insights:", error);
      // Generate sample insights as fallback
      const sampleInsights = generateSampleInsights();
      setInsights(sampleInsights);
      generateStats(sampleInsights);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleInsights = () => {
    const now = new Date();
    return [
      {
        id: 1,
        type: "reading_pattern",
        content_analysis: {
          sentiment: { polarity: 0.3, subjectivity: 0.6 },
          topics: ["technology", "productivity", "learning"],
          complexity: 0.7,
        },
        behavior_analysis: {
          engagement_level: 0.8,
          reading_speed: 250,
          focus_time: 15.5,
        },
        timestamp: now.toISOString(),
        message:
          "You show high engagement with technical content and tend to spend more time on complex articles.",
      },
      {
        id: 2,
        type: "content_preference",
        content_analysis: {
          sentiment: { polarity: 0.1, subjectivity: 0.4 },
          topics: ["development", "tools", "tutorials"],
          complexity: 0.8,
        },
        behavior_analysis: {
          engagement_level: 0.9,
          reading_speed: 200,
          focus_time: 22.3,
        },
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        message:
          "Your reading patterns suggest a preference for in-depth technical tutorials and development content.",
      },
    ];
  };

  const generateStats = (insightsData) => {
    if (insightsData.length === 0) {
      setStats(null);
      return;
    }

    const contentAnalyses = insightsData
      .filter((insight) => insight.content_analysis)
      .map((insight) => insight.content_analysis);

    const behaviorAnalyses = insightsData
      .filter((insight) => insight.behavior_analysis)
      .map((insight) => insight.behavior_analysis);

    const avgSentiment =
      contentAnalyses.reduce(
        (sum, analysis) => sum + (analysis.sentiment?.polarity || 0),
        0
      ) / Math.max(contentAnalyses.length, 1);

    const engagementLevels = behaviorAnalyses.map(
      (analysis) => analysis.engagement_level
    );
    const highEngagement = engagementLevels.filter(
      (level) => level === "high"
    ).length;

    const readingStyles = behaviorAnalyses.map(
      (analysis) => analysis.reading_style
    );
    const mostCommonStyle = getMostCommon(readingStyles);

    const contentTypes = contentAnalyses.map(
      (analysis) => analysis.content_type
    );
    const preferredType = getMostCommon(contentTypes);

    setStats({
      totalInsights: insightsData.length,
      avgSentiment: avgSentiment.toFixed(2),
      highEngagementRate: (
        (highEngagement / Math.max(behaviorAnalyses.length, 1)) *
        100
      ).toFixed(1),
      preferredReadingStyle: mostCommonStyle,
      preferredContentType: preferredType,
      lastUpdated: new Date(Math.max(...insightsData.map((i) => i.timestamp))),
    });
  };

  const getMostCommon = (arr) => {
    if (arr.length === 0) return "Unknown";

    const frequency = {};
    arr.forEach((item) => {
      frequency[item] = (frequency[item] || 0) + 1;
    });

    return Object.keys(frequency).reduce((a, b) =>
      frequency[a] > frequency[b] ? a : b
    );
  };

  const getSentimentColor = (polarity) => {
    if (polarity > 0.1) return "text-green-600";
    if (polarity < -0.1) return "text-red-600";
    return "text-yellow-600";
  };

  const getEngagementColor = (level) => {
    switch (level) {
      case "high":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading AI insights...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Brain className="w-6 h-6 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-800">AI Insights</h2>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">
                Total Insights
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {stats.totalInsights}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">
                Avg Sentiment
              </span>
            </div>
            <p
              className={`text-2xl font-bold mt-1 ${getSentimentColor(
                parseFloat(stats.avgSentiment)
              )}`}
            >
              {stats.avgSentiment}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">
                High Engagement
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {stats.highEngagementRate}%
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium text-gray-600">
                Reading Style
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-800 mt-1 capitalize">
              {stats.preferredReadingStyle}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">
                Content Type
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-800 mt-1 capitalize">
              {stats.preferredContentType}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">
                Last Updated
              </span>
            </div>
            <p className="text-sm text-gray-800 mt-1">
              {stats.lastUpdated.toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Recent Analysis</h3>

        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No AI insights available yet.</p>
            <p className="text-sm text-gray-500 mt-1">
              Browse some websites to start generating insights!
            </p>
          </div>
        ) : (
          insights.map((insight, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs text-gray-500">
                  {new Date(insight.timestamp).toLocaleString()}
                </span>
                {insight.stored && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Processed
                  </span>
                )}
              </div>

              {insight.content_analysis && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Content Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Sentiment: </span>
                      <span
                        className={`font-medium ${getSentimentColor(
                          insight.content_analysis.sentiment?.polarity || 0
                        )}`}
                      >
                        {insight.content_analysis.sentiment?.classification ||
                          "Unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Word Count: </span>
                      <span className="font-medium text-gray-800">
                        {insight.content_analysis.reading_metrics?.word_count ||
                          "N/A"}
                      </span>
                    </div>
                    {insight.content_analysis.topics &&
                      insight.content_analysis.topics.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Topics: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {insight.content_analysis.topics
                              .slice(0, 3)
                              .map((topic, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                                >
                                  {topic}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {insight.behavior_analysis && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">
                    Behavior Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Engagement: </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getEngagementColor(
                          insight.behavior_analysis.engagement_level
                        )}`}
                      >
                        {insight.behavior_analysis.engagement_level}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Reading Style: </span>
                      <span className="font-medium text-gray-800 capitalize">
                        {insight.behavior_analysis.reading_style}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Focus Quality: </span>
                      <span className="font-medium text-gray-800 capitalize">
                        {insight.behavior_analysis.focus_quality}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">AI Backend Required</h4>
            <p className="text-sm text-blue-700 mt-1">
              To see AI-powered insights, start the Python backend server:
            </p>
            <code className="block text-xs bg-blue-100 text-blue-800 p-2 rounded mt-2">
              cd backend && python app.py
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
