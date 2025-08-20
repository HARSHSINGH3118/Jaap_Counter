import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "https://jaap-counter.onrender.com";

let access = localStorage.getItem("access") || "";
let refresh = localStorage.getItem("refresh") || "";

export const setTokens = (a, r) => {
  if (a) { access = a; localStorage.setItem("access", a); }
  if (r) { refresh = r; localStorage.setItem("refresh", r); }
};

export const clearTokens = () => {
  access = ""; refresh = "";
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
};

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && refresh) {
      original._retry = true;
      try {
        refreshing = refreshing || axios.post(`${BASE_URL}/auth/refresh`, { refresh });
        const { data } = await refreshing;
        refreshing = null;
        setTokens(data.access, null);
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch {
        clearTokens();
      }
    }
    return Promise.reject(err);
  }
);

export default api;
