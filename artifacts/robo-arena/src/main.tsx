import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import "./styles/robowars.css";

// If deployed as a Static Site on Render, the API server will be on a different origin.
// VITE_API_URL should be set to the backend's URL (e.g., https://my-backend.onrender.com)
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL);
}

createRoot(document.getElementById("root")!).render(<App />);
