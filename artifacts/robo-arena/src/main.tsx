import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { getApiUrl } from "./lib/api-url";
import App from "./App";
import "./index.css";
import "./styles/robowars.css";

// Set the base URL for all customFetch API calls.
// This must happen before any component renders.
const apiUrl = getApiUrl();
if (apiUrl !== window.location.origin) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
