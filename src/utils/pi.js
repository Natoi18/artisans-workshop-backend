// src/utils/pi.js
import axios from "axios";

const PI_API_URL = "https://api.minepi.com/v2";

export const pi = axios.create({
  baseURL: PI_API_URL,
  headers: {
    "Authorization": `Key ${process.env.PI_API_KEY}`
  }
});
