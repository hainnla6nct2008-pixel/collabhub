import { useState } from "react";

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  BriefcaseBusiness,
  Database,
  Menu,
  X
} from "lucide-react";

import DataManagement from "./pages/DataManagement";

import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import StudyGroups from "./pages/StudyGroups";
import Schedule from "./pages/Schedule";
import Internship from "./pages/Internship";

import "./App.css";

function App() {
  const [page, setPage] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

 
const menu = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Study Groups", icon: Users },
  { name: "Students", icon: GraduationCap },
  { name: "Schedule", icon: CalendarDays },
  { name: "Internship", icon: BriefcaseBusiness },
  { name: "Data Management", icon: Database }
];


  function changePage(name) {
    setPage(name);
    setMenuOpen(false);
  }

  function renderPage() {
    switch (page) {
      case "Dashboard":
        return <Dashboard />;

      case "Study Groups":
        return <StudyGroups />;

      case "Students":
        return <Students />;

      case "Schedule":
        return <Schedule />;

      case "Internship":
        return <Internship />;
      case "Data Management":
         return <DataManagement />;
      default:
        return <Dashboard />;
    }
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <GraduationCap size={23} />
          </div>

          <h2 className="logo">CollabHub</h2>
        </div>

        <p className="sidebar-title">WORKSPACE</p>

        <nav>
          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={page === item.name ? "active" : ""}
                onClick={() => changePage(item.name)}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <p>CollabHub</p>
          <span>Smart Learning Platform</span>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="main">
        <header className="header">
          <div className="header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div>
              <h1>{page}</h1>
              <p>{currentDate}</p>
            </div>
          </div>

          <div className="header-right">
            <div className="header-user">
              <div className="avatar">S</div>

              <div className="user-info">
                <strong>Student</strong>
                <span>Workspace</span>
              </div>
            </div>
          </div>
        </header>

        {renderPage()}
      </main>
    </div>
  );
}

export default App;
