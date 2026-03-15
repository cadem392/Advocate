import fs from "node:fs";
import path from "node:path";

const checks = [];

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    const unquoted =
      rawValue.startsWith('"') && rawValue.endsWith('"')
        ? rawValue.slice(1, -1)
        : rawValue.startsWith("'") && rawValue.endsWith("'")
          ? rawValue.slice(1, -1)
          : rawValue;
    process.env[key] = unquoted;
  }
}

async function pingJSON(url, label) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      checks.push({
        label,
        status: "warn",
        detail: `${response.status} ${response.statusText}`,
      });
      return null;
    }

    const data = await response.json().catch(() => null);
    checks.push({
      label,
      status: "ok",
      detail: data ? JSON.stringify(data) : "reachable",
    });
    return data;
  } catch (error) {
    checks.push({
      label,
      status: "warn",
      detail: error instanceof Error ? error.message : "unreachable",
    });
    return null;
  }
}

function envStatus(name, required = false) {
  const value = process.env[name];
  checks.push({
    label: `env:${name}`,
    status: value ? "ok" : required ? "fail" : "warn",
    detail: value ? "configured" : required ? "missing" : "not set",
  });
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  envStatus("MODEL_SERVICE_URL", false);
  envStatus("OLLAMA_BASE_URL", false);
  envStatus("OLLAMA_MODEL", false);
  envStatus("OPENAI_API_KEY", false);
  envStatus("FIREBASE_ADMIN_CREDENTIALS_PATH", false);

  const modelServiceUrl = process.env.MODEL_SERVICE_URL || "http://127.0.0.1:8000";
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

  await pingJSON(`${modelServiceUrl}/health`, "model-service");
  await pingJSON(`${ollamaBaseUrl}/api/tags`, "ollama");

  const ordered = [
    ...checks.filter((entry) => entry.status === "fail"),
    ...checks.filter((entry) => entry.status === "warn"),
    ...checks.filter((entry) => entry.status === "ok"),
  ];

  for (const check of ordered) {
    const icon = check.status === "ok" ? "OK" : check.status === "warn" ? "WARN" : "FAIL";
    console.log(`${icon.padEnd(4)} ${check.label} - ${check.detail}`);
  }

  const hasFailure = ordered.some((entry) => entry.status === "fail");
  if (hasFailure) {
    process.exitCode = 1;
    return;
  }

  console.log("\nDoctor check complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
