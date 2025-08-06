import { useState, useEffect } from "react";
import { format } from "date-fns";
import useStore from "../store/useStore";
import {
  Brain,
  TrendingUp,
  Clock,
  Target,
  Zap,
  BookOpen,
  Eye,
  MousePointer,
  Globe,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

const AIAnalyticsDashboard = () => {
  const { interactions, highlights, notes, quotes, getStats } = useStore();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateAnalytics();
  }, [interactions, highlights, notes, quotes]);

  const generateAnalytics = () => {
    setIsLoading(true);

    try {
      const stats = getStats();
      const allItems = [...highlights, ...notes, ...quotes];

      // Reading patterns analysis
      const readingPatterns = analyzeReadingPatterns(interactions);

      // Content analysis
      const contentAnalysis = analyzeContent(allItems);

      // Time patterns
      const timePatterns = analyzeTimePatterns([...interactions, ...allItems]);

      // Domain insights
      const domainInsights = analyzeDomains(interactions, allItems);

      // Engagement metrics
      const engagement = analyzeEngagement(interactions, allItems);

      setAnalytics({
        overview: stats,
        readingPatterns,
        contentAnalysis,
        timePatterns,
        domainInsights,
        engagement,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error generating analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeReadingPatterns = (interactions) => {
    const patterns = {
      totalSessions: 0,
      avgSessionTime: 0,
      clickPatterns: {},
      scrollBehavior: {},
      mostActiveHours: {},
    };

    // Group interactions by session (domain + day)
    const sessions = {};
    interactions.forEach((interaction) => {
      const date = new Date(interaction.timestamp).toDateString();
      const domain = interaction.data.url
        ? new URL(interaction.data.url).hostname
        : "unknown";
      const sessionKey = `${domain}-${date}`;

      if (!sessions[sessionKey]) {
        sessions[sessionKey] = [];
      }
      sessions[sessionKey].push(interaction);
    });

    patterns.totalSessions = Object.keys(sessions).length;

    // Analyze click patterns
    const clickTypes = {};
    interactions.forEach((interaction) => {
      if (interaction.type === "click") {
        const element = interaction.data.element || "unknown";
        clickTypes[element] = (clickTypes[element] || 0) + 1;
      }
    });
    patterns.clickPatterns = clickTypes;

    // Analyze active hours
    const hourCounts = {};
    interactions.forEach((interaction) => {
      const hour = new Date(interaction.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    patterns.mostActiveHours = hourCounts;

    return patterns;
  };

  const analyzeContent = (items) => {
    const analysis = {
      totalWords: 0,
      avgContentLength: 0,
      topTopics: {},
      contentTypes: {
        highlight: items.filter((i) => i.text && !i.content).length,
        note: items.filter((i) => i.content).length,
        quote: items.filter((i) => i.text && !i.content).length,
      },
      readingLevel: "intermediate",
    };

    // Word count and topics
    let totalWords = 0;
    const wordFreq = {};

    items.forEach((item) => {
      const text = item.text || item.content || "";
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      totalWords += words.length;

      words.forEach((word) => {
        if (word.length > 3) {
          // Filter out short words
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
    });

    analysis.totalWords = totalWords;
    analysis.avgContentLength =
      items.length > 0 ? Math.round(totalWords / items.length) : 0;

    // Top topics (most frequent words)
    const topWords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [word, count]) => {
        obj[word] = count;
        return obj;
      }, {});

    analysis.topTopics = topWords;

    return analysis;
  };

  const analyzeTimePatterns = (allActivities) => {
    const patterns = {
      dailyActivity: {},
      weeklyTrends: {},
      monthlyGrowth: {},
      peakHours: [],
    };

    // Daily activity
    const dailyCounts = {};
    allActivities.forEach((activity) => {
      const date = new Date(activity.timestamp).toDateString();
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    patterns.dailyActivity = dailyCounts;

    // Weekly trends
    const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const weeklyCounts = {};
    allActivities.forEach((activity) => {
      const day = weekdays[new Date(activity.timestamp).getDay()];
      weeklyCounts[day] = (weeklyCounts[day] || 0) + 1;
    });
    patterns.weeklyTrends = weeklyCounts;

    // Peak hours
    const hourCounts = {};
    allActivities.forEach((activity) => {
      const hour = new Date(activity.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));

    patterns.peakHours = peakHours;

    return patterns;
  };

  const analyzeDomains = (interactions, items) => {
    const insights = {
      topDomains: {},
      domainEngagement: {},
      crossDomainPatterns: {},
    };

    // Domain activity counting
    const domainCounts = {};
    const domainEngagement = {};

    interactions.forEach((interaction) => {
      if (interaction.data.url) {
        const domain = new URL(interaction.data.url).hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    });

    items.forEach((item) => {
      if (item.domain) {
        domainEngagement[item.domain] =
          (domainEngagement[item.domain] || 0) + 1;
      }
    });

    insights.topDomains = domainCounts;
    insights.domainEngagement = domainEngagement;

    return insights;
  };

  const analyzeEngagement = (interactions, items) => {
    const metrics = {
      engagementRate: 0,
      qualityScore: 0,
      focusTime: 0,
      retentionRate: 0,
    };

    // Calculate engagement rate (items saved vs total interactions)
    if (interactions.length > 0) {
      metrics.engagementRate = Math.round(
        (items.length / interactions.length) * 100
      );
    }

    // Quality score based on content length and notes
    const itemsWithNotes = items.filter(
      (item) => item.note || (item.content && item.content.length > 50)
    );
    metrics.qualityScore =
      items.length > 0
        ? Math.round((itemsWithNotes.length / items.length) * 100)
        : 0;

    // Simple focus time estimation (time between meaningful interactions)
    if (interactions.length > 1) {
      const meaningfulInteractions = interactions.filter(
        (i) =>
          i.type === "text_selection" ||
          i.type === "scroll" ||
          i.type === "click"
      );
      if (meaningfulInteractions.length > 1) {
        const totalTime =
          meaningfulInteractions[meaningfulInteractions.length - 1].timestamp -
          meaningfulInteractions[0].timestamp;
        metrics.focusTime = Math.round(totalTime / (1000 * 60)); // Convert to minutes
      }
    }

    return metrics;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Generating analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5" />
          AI Analytics Dashboard
        </h2>
        <p className="text-sm text-gray-600">
          Generated{" "}
          {format(new Date(analytics.generatedAt), "MMM d, yyyy 'at' HH:mm")}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Engagement Rate"
          value={`${analytics.engagement.engagementRate}%`}
          icon={<Target className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Quality Score"
          value={`${analytics.engagement.qualityScore}%`}
          icon={<Star className="w-5 h-5" />}
          color="green"
        />
        <MetricCard
          title="Focus Time"
          value={`${analytics.engagement.focusTime}m`}
          icon={<Clock className="w-5 h-5" />}
          color="purple"
        />
        <MetricCard
          title="Active Sessions"
          value={analytics.readingPatterns.totalSessions}
          icon={<Activity className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Content Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Content Analysis
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Total Words Captured
              </span>
              <span className="font-semibold">
                {analytics.contentAnalysis.totalWords.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Content Length</span>
              <span className="font-semibold">
                {analytics.contentAnalysis.avgContentLength} words
              </span>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Content Types
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">🖍️ Highlights</span>
                  <span className="text-sm font-medium">
                    {analytics.contentAnalysis.contentTypes.highlight}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">💭 Notes</span>
                  <span className="text-sm font-medium">
                    {analytics.contentAnalysis.contentTypes.note}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">💾 Quotes</span>
                  <span className="text-sm font-medium">
                    {analytics.contentAnalysis.contentTypes.quote}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top Topics
          </h3>

          <div className="space-y-3">
            {Object.entries(analytics.contentAnalysis.topTopics)
              .slice(0, 8)
              .map(([topic, count]) => (
                <div key={topic} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 capitalize">
                    {topic}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${
                            (count /
                              Math.max(
                                ...Object.values(
                                  analytics.contentAnalysis.topTopics
                                )
                              )) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-6">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Time Patterns */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Activity Patterns
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Peak Hours
            </h4>
            <div className="space-y-2">
              {analytics.timePatterns.peakHours.map((peak, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {peak.hour}:00 - {peak.hour + 1}:00
                  </span>
                  <span className="text-sm font-medium">
                    {peak.count} activities
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Weekly Trends
            </h4>
            <div className="space-y-2">
              {Object.entries(analytics.timePatterns.weeklyTrends)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([day, count]) => (
                  <div key={day} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{day}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Domain Engagement
            </h4>
            <div className="space-y-2">
              {Object.entries(analytics.domainInsights.domainEngagement)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([domain, count]) => (
                  <div
                    key={domain}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-gray-600 truncate">
                      {domain}
                    </span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]} text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default AIAnalyticsDashboard;
