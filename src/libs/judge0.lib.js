import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY ?? "";

export const getJudge0LanguageId = (language) => {
  const languageMap = {
    PYTHON: 71,
    JAVA: 62,
    JAVASCRIPT: 63,
    TYPESCRIPT: 74,
  };
  return languageMap[language.toUpperCase()];
};

export const getLanguageName = (languageId) => {
  const languageMap = {
    71: "PYTHON",
    62: "JAVA",
    63: "JAVASCRIPT",
    74: "TYPESCRIPT",
  };
  return languageMap[languageId] ?? "UNKNOWN";
};

export const submitBatch = async (submissions) => {
  const options = {
    method: "POST",
    url: process.env.JUDGE0_API_URL + "/submissions/batch",
    params: { base64_encoded: "false" },
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${JUDGE0_API_KEY}`,  
    },
    data: { submissions },
  };

  const { data } = await axios.request(options);

  console.log("Submission Batch", data);

  return data; // [{tokens}, {tokens}, ...]
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Hybrid pooling - first 4 sec smart response then reduces pressure on API using smarter delay
export const pollBatchResults = async (tokens) => {
  let elapsed = 0;
  let interval = 1000; // Start with 1s
  let maxInterval = 8000; // Max wait time after exponential backoff

  while (true) {
    const options = {
      method: "GET",
      url: process.env.JUDGE0_API_URL + "/submissions/batch",
      params: {
        tokens: tokens.join(","),
        base64_encoded: false,
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env.JUDGE0_API_KEY}`,
      },
    };

    const { data } = await axios.request(options);
    const results = data.submissions;

    const isAllDone = results.every(
      (result) => result.status.id !== 1 && result.status.id !== 2
    );

    if (isAllDone) {
      return results;
    }

    await sleep(interval);

    elapsed += interval;

    // After 4 seconds, switch to exponential backoff (2s, 4s, 8s...)
    if (elapsed >= 4000) {
      interval = Math.min(interval * 2, maxInterval);
    }
  }
};
