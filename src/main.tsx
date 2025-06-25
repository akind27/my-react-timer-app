// src/main.tsx

import './logger.ts';
import { StrictMode, useEffect, useState, useRef, createContext, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
// We no longer need BrowserRouter, Routes, Route here because AppRouter handles it
// import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';

import Fallback from "./Fallback.tsx";
import SystemErrorBoundary from "./SystemErrorBoundary.tsx";
import "./index.css";
import ScreenshotComponent from "./components/ScreenshotComponent.tsx";
import AppRouter from "./components/Router.tsx"; // Renamed import to AppRouter for clarity

export const AuthTokenContext = createContext<string | null>(null);

const Root = () => {
  // These prototype modifications might cause issues with scrolling behavior
  // Consider removing or commenting them out if you experience unexpected scroll problems
  Element.prototype.scrollIntoView = function() { return false; };
  Element.prototype.scrollTo = function() { return false; };
  Element.prototype.scrollBy = function() { return false; };

  return (
    <HelmetProvider>
      {/* REMOVE BrowserRouter, Routes, and Route from here. AppRouter already has it. */}
      {/* <BrowserRouter>
        <Routes>
          <Route path="*" element={ */}
            <SystemErrorBoundary viewName="Fallback">
              <Suspense fallback={<div>Loading...</div>}>
                {/* Render AppRouter directly */}
                <AppRouter />
              </Suspense>
            </SystemErrorBoundary>
          {/* } />
        </Routes>
      </BrowserRouter> */}
      <ScreenshotComponent />
    </HelmetProvider>
  )
}

createRoot(document.getElementById("root")!).render(<Root />);