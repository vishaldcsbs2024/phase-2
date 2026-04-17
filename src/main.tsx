import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize dark mode from localStorage
const darkMode = localStorage.getItem("gigshield-dark-mode") === "true";
if (darkMode) {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
