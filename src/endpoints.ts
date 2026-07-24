const BASE_URL = "https://52-70-105-56.sslip.io";

export const API_ENDPOINTS = {
    replay: `${BASE_URL}/v1/replay`,
    ingest: `${BASE_URL}/v1/ingest`,
} as const;