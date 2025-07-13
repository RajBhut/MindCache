import { useState } from "react";
import useStore from "../store/useStore";
import {
  Save,
  Download,
  Upload,
  Trash2,
  Settings as SettingsIcon,
} from "lucide-react";

const Settings = () => {
  const { settings, saveSettings, clearData, exportData, importData, loading } =
    useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [importFile, setImportFile] = useState(null);

  const handleSaveSettings = async () => {
    await saveSettings(localSettings);
  };

  const handleExportData = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindcache-data-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      alert("Data imported successfully!");
    } catch (error) {
      alert("Error importing data: " + error.message);
    }
  };

  const handleClearData = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This action cannot be undone."
      )
    ) {
      await clearData();
      alert("All data cleared successfully!");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-6 h-6 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Tracking Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Tracking Preferences
            </h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings.trackingEnabled}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      trackingEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable interaction tracking
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={localSettings.dataRetentionDays}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      dataRetentionDays: parseInt(e.target.value),
                    }))
                  }
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How long to keep interaction data (1-365 days)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary Frequency
                </label>
                <select
                  value={localSettings.summarizeFrequency}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      summarizeFrequency: parseInt(e.target.value),
                    }))
                  }
                  className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={5}>Every 5 interactions</option>
                  <option value={10}>Every 10 interactions</option>
                  <option value={20}>Every 20 interactions</option>
                  <option value={50}>Every 50 interactions</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How often to generate activity summaries
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Settings
              </button>
            </div>
          </div>

          {/* Data Management */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Data Management
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Export Data
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Download all your interaction data and summaries as a JSON
                  file.
                </p>
                <button
                  onClick={handleExportData}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Import Data
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Import previously exported data. This will replace all current
                  data.
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="text-sm font-medium text-red-800 mb-2">
                  Danger Zone
                </h4>
                <p className="text-sm text-red-600 mb-3">
                  Permanently delete all stored data. This action cannot be
                  undone.
                </p>
                <button
                  onClick={handleClearData}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Data
                </button>
              </div>
            </div>
          </div>

          {/* Extension Info */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">About</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>MindCache</strong> - Web Interaction Tracker v1.0.0
              </p>
              <p className="text-xs text-gray-500">
                This extension tracks your web browsing interactions and
                generates summaries to help you understand your digital habits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
