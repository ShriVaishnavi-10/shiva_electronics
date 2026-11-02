import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

// Global axios interceptors: auto-attach JWT token + active branch to ALL requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const branch = localStorage.getItem("activeBranchId");
  if (branch && !config.headers["X-Active-Branch"]) {
    config.headers["X-Active-Branch"] = branch;
  }
  return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
      <ToastContainer
    position="top-right"
    autoClose={3000}
    hideProgressBar={false}
    newestOnTop
    closeOnClick
    pauseOnHover
    theme="colored"
  />
  </StrictMode>,
)

