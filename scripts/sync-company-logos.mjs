import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const VERCEL_MODELS_URL = "https://vercel.com/ai-gateway/models";
const outputPath = fileURLToPath(
  new URL("../src/generated/company-logos.json", import.meta.url),
);

function isTrustedLogoUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

function getUnoptimizedImageUrl(src) {
  try {
    const url = new URL(src.replaceAll("&amp;", "&"), VERCEL_MODELS_URL);
    const originalUrl = url.searchParams.get("url");
    return isTrustedLogoUrl(originalUrl) ? originalUrl : null;
  } catch {
    return null;
  }
}

function extractLogoUrls(html) {
  const urls = {};

  const registryMatch = html.match(/\\"logoUrls\\":(\{.*?\})/s);
  if (registryMatch) {
    const registry = JSON.parse(registryMatch[1].replaceAll('\\"', '"'));

    for (const [company, url] of Object.entries(registry)) {
      if (isTrustedLogoUrl(url)) urls[company] = url;
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*\balt="([^"]+) logo"[^>]*>/g)) {
    const company = match[1];
    const src = match[0].match(/\bsrc="([^"]+)"/)?.[1];
    const url = src ? getUnoptimizedImageUrl(src) : null;
    if (url) urls[company] = url;
  }

  if (Object.keys(urls).length === 0) {
    throw new Error("No company logos found in the Vercel model catalog");
  }

  return urls;
}

async function syncCompanyLogos() {
  const response = await fetch(VERCEL_MODELS_URL, {
    headers: { Accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error(`Vercel model catalog returned ${response.status}`);
  }

  const content = `${JSON.stringify(
    extractLogoUrls(await response.text()),
    null,
    2,
  )}\n`;

  let currentContent = "";
  try {
    currentContent = await readFile(outputPath, "utf8");
  } catch {
    // The first sync creates the generated manifest.
  }

  if (content === currentContent) {
    console.log("Company logo manifest is already current.");
    return;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);
  console.log(`Updated company logo manifest (${Object.keys(JSON.parse(content)).length} logos).`);
}

try {
  await syncCompanyLogos();
} catch (error) {
  try {
    await access(outputPath);
    console.warn(
      `Could not refresh company logos; using the existing manifest. ${error instanceof Error ? error.message : error}`,
    );
  } catch {
    throw error;
  }
}
