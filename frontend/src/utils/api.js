import axios from "axios";
import { API_BASE_URL } from "../config/urls";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeBranch = localStorage.getItem("activeBranchId");
  if (activeBranch) {
    config.headers["X-Active-Branch"] = activeBranch;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeBranchId");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);

export default api;

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export const hasPermission = (key) => {
  const user = getUser();
  if (!user) return false;
  if (user.role_name === "Admin" || user.role_name?.toLowerCase() === "super admin") return true;
  const isNonUser = user.role_name?.toLowerCase().includes("non user") || user.role_id === 6;
  if (isNonUser && key.startsWith("expenses.")) return true;
  return (user.permissions || []).includes(key);
};

export const getUserBranchIds = () => {
  const user = getUser();
  return user?.branch_ids || [];
};

export const getUserBranches = () => {
  const user = getUser();
  return user?.branches || [];
};

export const getActiveBranchId = () => {
  return localStorage.getItem("activeBranchId")
    ? parseInt(localStorage.getItem("activeBranchId"), 10)
    : 2;
};

export const setActiveBranchId = (id) => {
  if (id) {
    localStorage.setItem("activeBranchId", String(id));
  } else {
    localStorage.removeItem("activeBranchId");
  }
  window.dispatchEvent(new Event("branchChanged"));
};
