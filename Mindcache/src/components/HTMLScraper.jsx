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
} from "lucide-react";

const HTMLScraper = () => {
  const [scrapedData, setScrapedData] = useState([]);
  const [currentPageData, setCurrentPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadScrapedData();
  }, []);

  const loadScrapedData = () => {
    const data = JSON.parse(
      localStorage.getItem("mindcache-scraped-pages") || "[]"
    );
    setScrapedData(data);
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

  const filteredData = scrapedData.filter(
    (item) =>
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.data?.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            HTML Scraper
          </h2>
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search scraped pages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mt-4 flex gap-4 text-sm text-gray-600">
          <span>Total Pages: {scrapedData.length}</span>
          <span>Filtered: {filteredData.length}</span>
        </div>
      </div>

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
            />
          ))
        )}
      </div>
    </div>
  );
};

// Component for individual scraped page cards
const ScrapedPageCard = ({ page, onDelete, onExport }) => {
  const [expanded, setExpanded] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const openPage = () => {
    chrome.tabs.create({ url: page.url });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <h3 className="font-medium text-gray-900 truncate">{page.title}</h3>
          </div>

          <div className="text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-4">
              <span>{page.domain}</span>
              <span>
                {format(new Date(page.timestamp), "MMM d, yyyy HH:mm")}
              </span>
            </div>
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
