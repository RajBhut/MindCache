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
  Star,
} from "lucide-react";

const AIAnalyticsDashboard = () => {
  const { interactions, highlights, notes, quotes, getStats } = useStore();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState("unknown");

  useEffect(() => {
    generateAnalytics();
  }, [interactions, highlights, notes, quotes]);

  const fetchAnalyticsFromAPI = async () => {
    try {
      console.log("🔄 Attempting to fetch analytics from API...");
      const response = await fetch("http://localhost:5000/api/analytics", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("📡 API Response status:", response.status);
      console.log("📡 API Response headers:", response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Successfully fetched analytics data from API:", data);
        console.log("📊 Data structure:", Object.keys(data));
        return data;
      } else {
        const errorText = await response.text();
        console.warn(
          "⚠️ Failed to fetch analytics from API, status:",
          response.status,
          "Error:",
          errorText
        );
        return null;
      }
    } catch (error) {
      console.warn("❌ API not available, using local data:", error);
      console.warn("❌ Error details:", error.message, error.stack);
      return null;
    }
  };

  const generateAnalytics = async () => {
    setIsLoading(true);

    try {
      console.log("🚀 Starting analytics generation...");

      // First try to get analytics from backend API
      const apiAnalytics = await fetchAnalyticsFromAPI();

      if (apiAnalytics) {
        console.log("✅ Using API analytics data");
        setAnalytics(apiAnalytics);
        setDataSource("api");
        setIsLoading(false);
        return;
      }

      console.log("⚠️ Falling back to local analytics generation");
      setDataSource("local");

      // Fallback to local analysis
      const stats = getStats();
      const allItems = [...highlights, ...notes, ...quotes];

      console.log("📊 Available local data:", {
        interactions: interactions.length,
        highlights: highlights.length,
        notes: notes.length,
        quotes: quotes.length,
        stats,
      });

      // Try to get additional data from Chrome storage
      let chromeStorageData = null;
      try {
        if (typeof chrome !== "undefined" && chrome.storage) {
          const result = await chrome.storage.local.get([
            "interactions",
            "highlights",
            "notes",
            "quotes",
          ]);
          chromeStorageData = result;
          console.log("📊 Chrome storage data:", chromeStorageData);

          // Merge Chrome storage data with Zustand data
          const allInteractions = [
            ...interactions,
            ...(chromeStorageData.interactions || []),
          ];
          const allHighlights = [
            ...highlights,
            ...(chromeStorageData.highlights || []),
          ];
          const allNotes = [...notes, ...(chromeStorageData.notes || [])];
          const allQuotes = [...quotes, ...(chromeStorageData.quotes || [])];

          console.log("📊 Merged data totals:", {
            interactions: allInteractions.length,
            highlights: allHighlights.length,
            notes: allNotes.length,
            quotes: allQuotes.length,
          });

          // If we have significant data, use it instead of sample data
          if (
            allInteractions.length > 0 ||
            allHighlights.length > 0 ||
            allNotes.length > 0 ||
            allQuotes.length > 0
          ) {
            const readingPatterns = analyzeReadingPatterns(allInteractions);
            const contentAnalysis = analyzeContent([
              ...allHighlights,
              ...allNotes,
              ...allQuotes,
            ]);
            const timePatterns = analyzeTimePatterns([
              ...allInteractions,
              ...allHighlights,
              ...allNotes,
              ...allQuotes,
            ]);
            const domainInsights = analyzeDomains(allInteractions, [
              ...allHighlights,
              ...allNotes,
              ...allQuotes,
            ]);
            const engagement = analyzeEngagement(allInteractions, [
              ...allHighlights,
              ...allNotes,
              ...allQuotes,
            ]);

            setAnalytics({
              overview: stats,
              readingPatterns,
              contentAnalysis,
              timePatterns,
              domainInsights,
              engagement,
              generatedAt: new Date().toISOString(),
            });
            setDataSource("local");
            setIsLoading(false);
            return;
          }
        }
      } catch (storageError) {
        console.warn("Chrome storage access failed:", storageError);
      }

      // If no data exists, generate sample analytics for demo
      if (interactions.length === 0 && allItems.length === 0) {
        console.log("📊 Using sample analytics (no local data)");
        setAnalytics(generateSampleAnalytics());
        setDataSource("sample");
        setIsLoading(false);
        return;
      }

      console.log("📊 Generating analytics from local data:", {
        interactions: interactions.length,
        highlights: highlights.length,
        notes: notes.length,
        quotes: quotes.length,
      });

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
      setDataSource("local");
    } catch (error) {
      console.error("Error generating analytics:", error);
      // Fallback to sample data on error
      setAnalytics(generateSampleAnalytics());
      setDataSource("sample");
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
      try {
        if (
          !interaction.timestamp ||
          isNaN(new Date(interaction.timestamp).getTime())
        ) {
          return; // Skip invalid timestamps
        }
        const date = new Date(interaction.timestamp).toDateString();
        const domain = interaction.data.url
          ? new URL(interaction.data.url).hostname
          : "unknown";
        const sessionKey = `${domain}-${date}`;

        if (!sessions[sessionKey]) {
          sessions[sessionKey] = [];
        }
        sessions[sessionKey].push(interaction);
      } catch (error) {
        console.warn("Error processing interaction timestamp:", error);
      }
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
      try {
        if (
          !interaction.timestamp ||
          isNaN(new Date(interaction.timestamp).getTime())
        ) {
          return; // Skip invalid timestamps
        }
        const hour = new Date(interaction.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      } catch (error) {
        console.warn(
          "Error processing interaction timestamp for hours:",
          error
        );
      }
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
      try {
        if (
          activity.timestamp &&
          !isNaN(new Date(activity.timestamp).getTime())
        ) {
          const date = new Date(activity.timestamp).toDateString();
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        }
      } catch (error) {
        console.warn("Invalid timestamp in activity:", activity.timestamp);
      }
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
      try {
        if (
          activity.timestamp &&
          !isNaN(new Date(activity.timestamp).getTime())
        ) {
          const day = weekdays[new Date(activity.timestamp).getDay()];
          weeklyCounts[day] = (weeklyCounts[day] || 0) + 1;
        }
      } catch (error) {
        console.warn("Invalid timestamp in activity:", activity.timestamp);
      }
    });
    patterns.weeklyTrends = weeklyCounts;

    // Peak hours
    const hourCounts = {};
    allActivities.forEach((activity) => {
      try {
        if (
          activity.timestamp &&
          !isNaN(new Date(activity.timestamp).getTime())
        ) {
          const hour = new Date(activity.timestamp).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      } catch (error) {
        console.warn("Invalid timestamp in activity:", activity.timestamp);
      }
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

  const generateSampleAnalytics = () => {
    const now = new Date();
    return {
      readingPatterns: {
        avgSessionTime: 15.5,
        totalSessions: 12,
        clickPatterns: {
          article: 8,
          button: 5,
          link: 12,
          p: 15,
        },
        scrollBehavior: {
          totalDistance: 24567,
          avgScrollSpeed: 350,
        },
        mostActiveHours: {
          14: 8,
          10: 6,
          16: 5,
        },
      },
      contentAnalysis: {
        topTopics: {
          technology: 15,
          productivity: 12,
          learning: 8,
          development: 7,
          programming: 6,
          javascript: 5,
          tutorial: 4,
          guide: 3,
        },
        totalWords: 12500,
        avgContentLength: 180,
        contentTypes: {
          highlight: 25,
          note: 18,
          quote: 12,
        },
        readingLevel: "Advanced",
        averageComplexity: 0.75,
        sentimentDistribution: {
          positive: 45,
          neutral: 40,
          negative: 15,
        },
      },
      timePatterns: {
        peakHours: [
          { hour: 14, count: 8 },
          { hour: 10, count: 6 },
          { hour: 16, count: 5 },
        ],
        weeklyTrends: {
          Monday: 12,
          Tuesday: 8,
          Wednesday: 15,
          Thursday: 10,
          Friday: 7,
          Saturday: 3,
          Sunday: 5,
        },
        dailyActivity: {},
        monthlyGrowth: {},
      },
      domainInsights: {
        topDomains: {
          "github.com": 8,
          "stackoverflow.com": 6,
          "medium.com": 4,
          "dev.to": 3,
        },
        domainEngagement: {
          "github.com": 12,
          "stackoverflow.com": 8,
          "medium.com": 6,
          "dev.to": 4,
        },
        crossDomainPatterns: {},
      },
      engagement: {
        totalSessions: 12,
        avgSessionTime: 15.5,
        noteCreationRate: 25,
        focusTime: 45,
        engagementScore: 78,
        engagementRate: 67,
        qualityScore: 82,
        retentionRate: 75,
      },
      generatedAt: new Date().toISOString(),
    };
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
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Generated{" "}
            {analytics.generatedAt &&
            !isNaN(new Date(analytics.generatedAt).getTime())
              ? format(
                  new Date(analytics.generatedAt),
                  "MMM d, yyyy 'at' HH:mm"
                )
              : format(new Date(), "MMM d, yyyy 'at' HH:mm")}{" "}
            <span
              className={`ml-2 px-2 py-1 text-xs rounded ${
                dataSource === "api"
                  ? "bg-green-100 text-green-800"
                  : dataSource === "local"
                  ? "bg-yellow-100 text-yellow-800"
                  : dataSource === "imported"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {dataSource === "api"
                ? "🌐 Live API"
                : dataSource === "local"
                ? "💾 Local Data"
                : dataSource === "imported"
                ? "📁 Imported Data"
                : "📊 Sample Data"}
            </span>
          </p>
          <button
            onClick={async () => {
              console.log("🧪 Manual API test triggered");
              const testData = await fetchAnalyticsFromAPI();
              if (testData) {
                alert("✅ API Connected! Check console for details.");
              } else {
                alert("❌ API Connection Failed! Using sample data.");
              }
            }}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
          >
            Test API
          </button>
          <button
            onClick={() => {
              // Force refresh analytics
              generateAnalytics();
            }}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 mr-2"
          >
            Refresh Data
          </button>
          <label className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 cursor-pointer">
            Import Data
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    console.log("📥 Imported data:", data);

                    // Process imported data and convert to analytics
                    if (data.pages && Array.isArray(data.pages)) {
                      const processedInteractions = data.pages.map(
                        (page, index) => ({
                          id: page.id || index,
                          type: "imported_interaction",
                          data: {
                            url: page.url,
                            title: page.title,
                            domain: page.domain,
                            content: page.data?.content,
                          },
                          timestamp: page.timestamp || new Date().toISOString(),
                        })
                      );

                      // Analyze imported data
                      const readingPatterns = analyzeReadingPatterns(
                        processedInteractions
                      );
                      const contentAnalysis = analyzeContent([]);
                      const timePatterns = analyzeTimePatterns(
                        processedInteractions
                      );
                      const domainInsights = analyzeDomains(
                        processedInteractions,
                        []
                      );
                      const engagement = analyzeEngagement(
                        processedInteractions,
                        []
                      );

                      setAnalytics({
                        readingPatterns,
                        contentAnalysis,
                        timePatterns,
                        domainInsights,
                        engagement,
                        generatedAt: new Date().toISOString(),
                      });
                      setDataSource("imported");
                      alert(
                        `✅ Successfully imported ${data.pages.length} pages of data!`
                      );
                    } else {
                      alert(
                        "❌ Invalid data format. Expected JSON with 'pages' array."
                      );
                    }
                  } catch (error) {
                    console.error("Import error:", error);
                    alert(
                      "❌ Failed to import data. Please check the file format."
                    );
                  }
                }
              }}
            />
          </label>
        </div>
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
        <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
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

        <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top Topics
          </h3>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {Object.entries(analytics.contentAnalysis.topTopics)
              .slice(0, 8)
              .map(([topic, count]) => (
                <div key={topic} className="flex justify-between items-center">
                  <span
                    className="text-sm text-gray-700 capitalize truncate max-w-[120px]"
                    title={topic}
                  >
                    {topic}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
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
                    <span className="text-xs text-gray-500 w-6 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Time Patterns */}
      <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Activity Patterns
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Peak Hours
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {analytics.timePatterns.peakHours.map((peak, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 truncate">
                    {peak.hour}:00 - {peak.hour + 1}:00
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap ml-2">
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
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Object.entries(analytics.timePatterns.weeklyTrends)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([day, count]) => (
                  <div key={day} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate">
                      {day}
                    </span>
                    <span className="text-sm font-medium whitespace-nowrap ml-2">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Domain Engagement
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Object.entries(analytics.domainInsights.domainEngagement)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([domain, count]) => (
                  <div
                    key={domain}
                    className="flex justify-between items-center"
                  >
                    <span
                      className="text-sm text-gray-600 truncate max-w-[120px]"
                      title={domain}
                    >
                      {domain}
                    </span>
                    <span className="text-sm font-medium whitespace-nowrap ml-2">
                      {count}
                    </span>
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
    <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
        </div>
        <div
          className={`p-3 rounded-lg ${colorClasses[color]} text-white flex-shrink-0 ml-4`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default AIAnalyticsDashboard;
