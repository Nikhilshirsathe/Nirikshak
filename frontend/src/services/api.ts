import axios from "axios";
import { supabase } from "@/lib/supabase";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// ── Inject Supabase access token into every request ────────────────────────
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Handle 401 globally (re-route to sign-in, but avoid infinite loops) ──
let _isReloading = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !_isReloading
    ) {
      _isReloading = true;
      supabase.auth.signOut();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);

export const uploadDataset = async (file: File): Promise<{
  message: string;
  records: number;
  flagged: number;
  results: import("@/utils/types").Transaction[];
}> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/upload/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getPredictions = async (): Promise<{
  results: import("@/utils/types").Transaction[];
  total: number;
}> => {
  const res = await api.get("/prediction/results");
  return res.data;
};

export const getShapExplanation = async (transactionId: string): Promise<unknown> => {
  const res = await api.get(`/explain/${transactionId}`);
  return res.data;
};

export const chatWithAI = async (message: string): Promise<{ answer: string }> => {
  const res = await api.post("/chat/", { message });
  return res.data;
};

export const generateReport = async (config: {
  report_type: "dataset" | "account";
  account_id?: string;
  include_risk_analysis: boolean;
  include_shap: boolean;
  include_transaction_table: boolean;
  pii_redaction: boolean;
}): Promise<{
  report_id: string;
  generated_at: string;
  report_type: string;
  account_id: string | null;
  stats: Record<string, number>;
  category_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  risk_buckets: Record<string, number>;
  shap_data: unknown[];
  llm_summary: string;
  transactions: unknown[];
  pii_redaction: boolean;
  message: string;
}> => {
  const res = await api.post("/reports/generate", config);
  return res.data;
};

export const getAlerts = async (): Promise<unknown[]> => {
  const res = await api.get("/alerts");
  return res.data;
};

export const resolveAlert = async (alertId: string): Promise<{ message: string }> => {
  const res = await api.patch(`/alerts/${alertId}/resolve`);
  return res.data;
};

export const getSessionInfo = async (): Promise<{
  user_id: string;
  email: string;
  role: string;
  has_data: boolean;
}> => {
  const res = await api.get("/session/me");
  return res.data;
};

export const logoutSession = async (): Promise<{ message: string }> => {
  const res = await api.post("/session/logout");
  return res.data;
};

export default api;