import './logger.ts';
import { StrictMode, useEffect, useState, useRef, createContext, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';

import Fallback from "./Fallback.tsx";
import SystemErrorBoundary from "./SystemErrorBoundary.tsx";
import "./index.css";
import ScreenshotComponent from "./components/ScreenshotComponent.tsx";
import Router from "./components/Router.tsx";

export const AuthTokenContext = createContext<string | null>(null);
const Root = () => {
  Element.prototype.scrollIntoView = function() { return false; };
  Element.prototype.scrollTo = function() { return false; };
  Element.prototype.scrollBy = function() { return false; };

  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={
            <SystemErrorBoundary viewName="Fallback">
              <Suspense fallback={<div>Loading...</div>}>
                <Router />
              </Suspense>
            </SystemErrorBoundary>
          } />
        </Routes>
      </BrowserRouter>
      <ScreenshotComponent />
    </HelmetProvider>
  )
}

createRoot(document.getElementById("root")!).render(<Root />);