import { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import useStore from "./store/useStore";
import Dashboard from "./components/Dashboard";
import InteractionsList from "./components/InteractionsList";
import SummariesView from "./components/SummariesView";
import Settings from "./components/Settings";
import Navigation from "./components/Navigation";
import LoadingSpinner from "./components/LoadingSpinner";
import ErrorMessage from "./components/ErrorMessage";
import "./App.css";

function App() {
  const { loading, error, loadData } = useStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <div className="w-full">
          {error && <ErrorMessage message={error} />}

          <header className="bg-white shadow-sm border-b">
            <div className="px-4 py-3">
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">MC</span>
                </div>
                MindCache
              </h1>
              <p className="text-xs text-gray-600 mt-1">
                Web interaction tracker
              </p>
            </div>
            <Navigation />
          </header>

          <main className="p-4">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/index.html"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/interactions" element={<InteractionsList />} />
              <Route path="/summaries" element={<SummariesView />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
