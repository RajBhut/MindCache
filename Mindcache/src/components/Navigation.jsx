import { NavLink } from "react-router-dom";
import {
  BarChart3,
  List,
  FileText,
  Settings,
  Brain,
  Highlighter,
} from "lucide-react";

const Navigation = () => {
  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { to: "/mindcache", label: "MindCache", icon: Highlighter },
    { to: "/interactions", label: "Interactions", icon: List },
    { to: "/summaries", label: "Summaries", icon: FileText },
    { to: "/ai-insights", label: "AI Insights", icon: Brain },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="border-t border-gray-200">
      <div className="flex">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors flex-1 justify-center ${
                isActive
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`
            }
          >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
