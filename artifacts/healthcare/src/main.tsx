import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(() => {
  try {
    return localStorage.getItem("mediflow_token");
  } catch {
    return null;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
