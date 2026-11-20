import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { StoreProvider } from "./lib/store";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/Confirm";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><StoreProvider><ToastProvider><ConfirmProvider><App /></ConfirmProvider></ToastProvider></StoreProvider></BrowserRouter></StrictMode>
);
