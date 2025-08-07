import { useState, useEffect } from "react";
import { format } from "date-fns";
import useStore from "../store/useStore";
import {
  Globe,
  Download,
  FileText,
  Image,
  Link,
  Search,
  Trash2,
  Eye,
  Copy,
  RefreshCw,
  Save,
  Filter,
  Tag,
  Calendar,
  BarChart3,
  Archive,
  Star,
  Clock,
  ExternalLink,
} from "lucide-react";

const HTMLScraper = () => {
  const [scrapedData, setScrapedData] = useState([]);
  const [currentPageData, setCurrentPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("timestamp");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");

  useEffect(() => {
    loadScrapedData();
  }, []);

  const loadScrapedData = () => {
    const data = JSON.parse(
      localStorage.getItem("mindcache-scraped-pages") || "[]"
    );
    setScrapedData(data);

    // Extract unique tags
    const allTags = data.flatMap((item) => item.tags || []);
    const uniqueTags = [...new Set(allTags)];
    setTags(uniqueTags);
  };

  const scrapeCurrentPage = async () => {
    setIsLoading(true);

    try {
      // Get current tab info
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Inject content script to scrape page data
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageData,
      });

      const pageData = {
        id: Date.now(),
        url: tab.url,
        title: tab.title,
        domain: new URL(tab.url).hostname,
        timestamp: new Date().toISOString(),
        data: result.result,
        tags: [],
        starred: false,
        wordCount: result.result.content
          ? result.result.content.split(/\s+/).length
          : 0,
        readingTime: result.result.content
          ? Math.ceil(result.result.content.split(/\s+/).length / 200)
          : 0,
      };

      // Save to localStorage
      const existingData = JSON.parse(
        localStorage.getItem("mindcache-scraped-pages") || "[]"
      );
      const updatedData = [
        pageData,
        ...existingData.filter((item) => item.url !== tab.url),
      ];
      localStorage.setItem(
        "mindcache-scraped-pages",
        JSON.stringify(updatedData)
      );

      setCurrentPageData(pageData);
      loadScrapedData();
    } catch (error) {
      console.error("Error scraping page:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const batchDeleteSelected = () => {
    if (selectedItems.length === 0) return;

    if (confirm(`Delete ${selectedItems.length} selected pages?`)) {
      const updatedData = scrapedData.filter(
        (item) => !selectedItems.includes(item.id)
      );
      localStorage.setItem(
        "mindcache-scraped-pages",
        JSON.stringify(updatedData)
      );
      setScrapedData(updatedData);
      setSelectedItems([]);
    }
  };

  const exportSelected = () => {
    const itemsToExport =
      selectedItems.length > 0
        ? scrapedData.filter((item) => selectedItems.includes(item.id))
        : filteredData;

    const exportData = {
      exportDate: new Date().toISOString(),
      totalPages: itemsToExport.length,
      pages: itemsToExport,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindcache-batch-export-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addTagToPage = (pageId, tag) => {
    const updatedData = scrapedData.map((page) => {
      if (page.id === pageId) {
        const newTags = [...(page.tags || [])];
        if (!newTags.includes(tag)) {
          newTags.push(tag);
        }
        return { ...page, tags: newTags };
      }
      return page;
    });

    localStorage.setItem(
      "mindcache-scraped-pages",
      JSON.stringify(updatedData)
    );
    setScrapedData(updatedData);
    loadScrapedData();
  };

  const toggleStar = (pageId) => {
    const updatedData = scrapedData.map((page) => {
      if (page.id === pageId) {
        return { ...page, starred: !page.starred };
      }
      return page;
    });

    localStorage.setItem(
      "mindcache-scraped-pages",
      JSON.stringify(updatedData)
    );
    setScrapedData(updatedData);
  };

  const analyzeContent = () => {
    const analysis = {
      totalPages: scrapedData.length,
      totalWords: scrapedData.reduce(
        (sum, page) => sum + (page.wordCount || 0),
        0
      ),
      avgReadingTime:
        scrapedData.length > 0
          ? Math.round(
              scrapedData.reduce(
                (sum, page) => sum + (page.readingTime || 0),
                0
              ) / scrapedData.length
            )
          : 0,
      topDomains: {},
      contentTypes: {},
      monthlyActivity: {},
    };

    // Domain analysis
    scrapedData.forEach((page) => {
      analysis.topDomains[page.domain] =
        (analysis.topDomains[page.domain] || 0) + 1;
    });

    // Monthly activity
    scrapedData.forEach((page) => {
      const month = new Date(page.timestamp).toISOString().substring(0, 7);
      analysis.monthlyActivity[month] =
        (analysis.monthlyActivity[month] || 0) + 1;
    });

    return analysis;
  };

  const deleteScrapedPage = (id) => {
    const updatedData = scrapedData.filter((item) => item.id !== id);
    localStorage.setItem(
      "mindcache-scraped-pages",
      JSON.stringify(updatedData)
    );
    setScrapedData(updatedData);
  };

  const exportPageData = (pageData) => {
    const blob = new Blob([JSON.stringify(pageData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scraped-${pageData.domain}-${
      new Date(pageData.timestamp).toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredData = scrapedData
    .filter((item) => {
      // Text search
      const searchMatch =
        !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.data?.content?.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      const typeMatch =
        filterType === "all" ||
        (filterType === "starred" && item.starred) ||
        (filterType === "recent" &&
          new Date() - new Date(item.timestamp) < 7 * 24 * 60 * 60 * 1000) ||
        (filterType === "long" && (item.readingTime || 0) > 5);

      // Tag filter
      const tagMatch =
        !selectedTag || (item.tags && item.tags.includes(selectedTag));

      return searchMatch && typeMatch && tagMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "domain":
          return a.domain.localeCompare(b.domain);
        case "reading-time":
          return (b.readingTime || 0) - (a.readingTime || 0);
        case "word-count":
          return (b.wordCount || 0) - (a.wordCount || 0);
        default: // timestamp
          return new Date(b.timestamp) - new Date(a.timestamp);
      }
    });

  const analytics = analyzeContent();

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            HTML Scraper
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <button
              onClick={scrapeCurrentPage}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isLoading ? "Scraping..." : "Scrape Current Page"}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Pages</option>
            <option value="starred">⭐ Starred</option>
            <option value="recent">📅 Recent (7 days)</option>
            <option value="long">📖 Long reads (5+ min)</option>
          </select>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="timestamp">📅 Date</option>
            <option value="title">🔤 Title</option>
            <option value="domain">🌐 Domain</option>
            <option value="reading-time">⏱️ Reading Time</option>
            <option value="word-count">📝 Word Count</option>
          </select>
        </div>

        {/* Batch Operations */}
        {selectedItems.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedItems.length} item(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={exportSelected}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
                <button
                  onClick={batchDeleteSelected}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedItems([])}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
          <span>Total: {scrapedData.length}</span>
          <span>Filtered: {filteredData.length}</span>
          <span>Selected: {selectedItems.length}</span>
          <span>Starred: {scrapedData.filter((p) => p.starred).length}</span>
          <span>Words: {analytics.totalWords.toLocaleString()}</span>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Content Analytics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Overview</h4>
              <div className="space-y-2 text-sm">
                <div>
                  Total Pages: <strong>{analytics.totalPages}</strong>
                </div>
                <div>
                  Total Words:{" "}
                  <strong>{analytics.totalWords.toLocaleString()}</strong>
                </div>
                <div>
                  Avg Reading Time:{" "}
                  <strong>{analytics.avgReadingTime} min</strong>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Top Domains</h4>
              <div className="space-y-1 text-sm">
                {Object.entries(analytics.topDomains)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([domain, count]) => (
                    <div key={domain} className="flex justify-between">
                      <span className="truncate">{domain}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                Activity Timeline
              </h4>
              <div className="space-y-1 text-sm">
                {Object.entries(analytics.monthlyActivity)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 5)
                  .map(([month, count]) => (
                    <div key={month} className="flex justify-between">
                      <span>
                        {new Date(month).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                        })}
                      </span>
                      <strong>{count}</strong>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Page Preview */}
      {currentPageData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-green-900 mb-2">
            Latest Scraped Page
          </h3>
          <ScrapedPageCard
            page={currentPageData}
            onDelete={deleteScrapedPage}
            onExport={exportPageData}
            onToggleStar={toggleStar}
            onAddTag={addTagToPage}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
          />
        </div>
      )}

      {/* Scraped Pages List */}
      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No scraped pages found</p>
            <p className="text-sm text-gray-400">
              {searchTerm
                ? "Try a different search term"
                : "Click 'Scrape Current Page' to get started"}
            </p>
          </div>
        ) : (
          filteredData.map((page) => (
            <ScrapedPageCard
              key={page.id}
              page={page}
              onDelete={deleteScrapedPage}
              onExport={exportPageData}
              onToggleStar={toggleStar}
              onAddTag={addTagToPage}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Component for individual scraped page cards
const ScrapedPageCard = ({
  page,
  onDelete,
  onExport,
  onToggleStar,
  onAddTag,
  selectedItems,
  setSelectedItems,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  const isSelected = selectedItems.includes(page.id);

  const toggleSelection = () => {
    if (isSelected) {
      setSelectedItems(selectedItems.filter((id) => id !== page.id));
    } else {
      setSelectedItems([...selectedItems, page.id]);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(page.id, newTag.trim());
      setNewTag("");
      setShowTagInput(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const openPage = () => {
    chrome.tabs.create({ url: page.url });
  };

  return (
    <div
      className={`bg-white border rounded-lg p-4 ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={toggleSelection}
            className="mt-1"
          />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-gray-900 truncate flex-1">
                {page.title}
              </h3>

              {/* Star button */}
              <button
                onClick={() => onToggleStar(page.id)}
                className={`p-1 rounded ${
                  page.starred
                    ? "text-yellow-500 hover:text-yellow-600"
                    : "text-gray-400 hover:text-yellow-500"
                }`}
              >
                <Star
                  className={`w-4 h-4 ${page.starred ? "fill-current" : ""}`}
                />
              </button>
            </div>

            <div className="text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-4 flex-wrap">
                <span>{page.domain}</span>
                <span>
                  {format(new Date(page.timestamp), "MMM d, yyyy HH:mm")}
                </span>
                {page.readingTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {page.readingTime} min read
                  </span>
                )}
                {page.wordCount && (
                  <span>{page.wordCount.toLocaleString()} words</span>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {page.tags &&
                page.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}

              {showTagInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                    placeholder="Tag name"
                    className="text-xs px-2 py-1 border rounded w-20"
                    autoFocus
                  />
                  <button
                    onClick={handleAddTag}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowTagInput(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  Add tag
                </button>
              )}
            </div>

            {/* Data Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{page.data?.content?.length || 0} chars</span>
              </div>
              <div className="flex items-center gap-1">
                <Image className="w-3 h-3" />
                <span>{page.data?.images?.length || 0} images</span>
              </div>
              <div className="flex items-center gap-1">
                <Link className="w-3 h-3" />
                <span>{page.data?.links?.length || 0} links</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{page.data?.headings?.length || 0} headings</span>
              </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
              <div className="mt-4 space-y-3 border-t pt-4">
                {page.data?.content && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      Content Preview
                    </h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                      {page.data.content.substring(0, 500)}...
                    </p>
                  </div>
                )}

                {page.data?.headings?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Headings</h4>
                    <div className="space-y-1">
                      {page.data.headings.slice(0, 5).map((heading, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          <span className="font-medium">{heading.tag}:</span>{" "}
                          {heading.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {page.data?.meta && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Metadata</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {page.data.meta.description && (
                        <div>
                          <span className="font-medium">Description:</span>{" "}
                          {page.data.meta.description}
                        </div>
                      )}
                      {page.data.meta.keywords && (
                        <div>
                          <span className="font-medium">Keywords:</span>{" "}
                          {page.data.meta.keywords}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title={expanded ? "Collapse" : "Expand"}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => copyToClipboard(page.data?.content || "")}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy content"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={openPage}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Open page"
            >
              <Link className="w-4 h-4" />
            </button>
            <button
              onClick={() => onExport(page)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Export data"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(page.id)}
              className="p-2 text-red-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Function to inject into page for scraping
function extractPageData() {
  const data = {
    content: document.body.innerText,
    html: document.documentElement.outerHTML,
    title: document.title,
    url: window.location.href,
    headings: [],
    links: [],
    images: [],
    meta: {},
  };

  // Extract headings
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  data.headings = Array.from(headings).map((h) => ({
    tag: h.tagName.toLowerCase(),
    text: h.innerText.trim(),
  }));

  // Extract links
  const links = document.querySelectorAll("a[href]");
  data.links = Array.from(links)
    .map((link) => ({
      text: link.innerText.trim(),
      href: link.href,
    }))
    .filter((link) => link.text && link.href);

  // Extract images
  const images = document.querySelectorAll("img[src]");
  data.images = Array.from(images).map((img) => ({
    src: img.src,
    alt: img.alt,
  }));

  // Extract meta data
  const metaDescription = document.querySelector('meta[name="description"]');
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  const metaAuthor = document.querySelector('meta[name="author"]');

  if (metaDescription) data.meta.description = metaDescription.content;
  if (metaKeywords) data.meta.keywords = metaKeywords.content;
  if (metaAuthor) data.meta.author = metaAuthor.content;

  return data;
}

export default HTMLScraper;
