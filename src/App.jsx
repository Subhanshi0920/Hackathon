import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppDataProvider } from "./data/DataContext.jsx";
import Upload from "./pages/Upload.jsx";
import Dashboard from "./pages/Dashboard.jsx";

// AppDataProvider wraps the router so upload state (which docs are loaded)
// is shared across the /upload and /dashboard routes — /dashboard is gated
// on all three documents being uploaded (see Dashboard.jsx).
export default function App() {
  return (
    <AppDataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </AppDataProvider>
  );
}
