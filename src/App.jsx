import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";

// Route table lives here — add new <Route> entries below as new pages
// (e.g. loan detail, application flow, RM view) come online. The
// Dashboard's cards/buttons can then use useNavigate() or <Link> to
// redirect into those routes.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
