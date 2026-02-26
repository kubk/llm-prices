"use client";

import * as React from "react";
import { fetchModels, type ModelCatalog, type ProviderModel } from "tokenlens";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react";
import {
  Loader2,
  Columns3,
  Brain,
  Wrench,
  Paperclip,
  Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SortField = "input" | "output" | "context" | "name";
type SortDirection = "asc" | "desc";

// Capability filter options based on output modalities
type CapabilityFilter = "all" | "text" | "image" | "audio" | "video";

// Optional columns that can be toggled
type OptionalColumn = "provider" | "releaseDate" | "knowledge" | "reasoningPrice" | "capabilities";

interface ModelRow {
  provider: string;
  company: string;
  name: string;
  id: string;
  inputPrice: number | undefined;
  outputPrice: number | undefined;
  cacheReadPrice: number | undefined;
  cacheWritePrice: number | undefined;
  reasoningPrice: number | undefined;
  contextSize: number | undefined;
  maxOutput: number | undefined;
  outputModalities: string[];
  releaseDate: string | undefined;
  knowledge: string | undefined;
  hasReasoning: boolean;
  hasToolCall: boolean;
  hasAttachment: boolean;
  hasTemperature: boolean;
}

// Icons that need dark:invert because they are dark on transparent background
const DARK_INVERT_ICONS = new Set(["openai", "meta", "meta-llama", "perplexity"]);

// Company icon URLs - scraped from OpenRouter, with Google favicon fallback
const COMPANY_ICONS: Record<string, string> = {
  openai: "https://openrouter.ai/images/icons/OpenAI.svg",
  google: "https://openrouter.ai/images/icons/GoogleGemini.svg",
  anthropic: "https://openrouter.ai/images/icons/Anthropic.svg",
  deepseek: "https://openrouter.ai/images/icons/DeepSeek.png",
  meta: "https://openrouter.ai/images/icons/Meta.png",
  "meta-llama": "https://openrouter.ai/images/icons/Meta.png",
  mistral: "https://openrouter.ai/images/icons/Mistral.png",
  mistralai: "https://openrouter.ai/images/icons/Mistral.png",
  cohere: "https://openrouter.ai/images/icons/Cohere.png",
  perplexity: "https://openrouter.ai/images/icons/Perplexity.svg",
};

// Fallback: Google Favicon service for companies without OpenRouter icons
const COMPANY_WEBSITES: Record<string, string> = {
  moonshotai: "https://moonshot.ai",
  alibaba: "https://qwenlm.ai",
  amazon: "https://nova.amazon.com",
  "arcee-ai": "https://arcee.ai",
  bytedance: "https://bytedance.com",
  inception: "https://www.inceptionlabs.ai",
  meituan: "https://meituan.com",
  minimax: "https://minimaxi.com",
  morph: "https://morph.so",
  nvidia: "https://nvidia.com",
  "prime-intellect": "https://www.primeintellect.ai",
  vercel: "https://vercel.com",
  voyage: "https://voyageai.com",
  xai: "https://x.ai",
  "x-ai": "https://x.ai",
  xiaomi: "https://xiaomi.com",
  zai: "https://zai.com",
};

function getCompanyIconUrl(company: string): string | null {
  if (COMPANY_ICONS[company]) return COMPANY_ICONS[company];
  if (COMPANY_WEBSITES[company]) {
    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${COMPANY_WEBSITES[company]}&size=128`;
  }
  return null;
}

function CompanyIcon({ company, className }: { company: string; className?: string }) {
  const [error, setError] = React.useState(false);
  const url = getCompanyIconUrl(company);

  if (!url || error) {
    // Fallback: first letter of company
    return (
      <div className={cn("flex items-center justify-center rounded-sm bg-muted text-[9px] font-bold uppercase text-muted-foreground", className)}>
        {company.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={company}
      className={cn("rounded-sm object-contain", DARK_INVERT_ICONS.has(company) && "dark:invert", className)}
      onError={() => setError(true)}
    />
  );
}


function formatPrice(price: number | undefined): string {
  if (price === undefined || price === null) return "—";
  if (price === 0) return "$0";
  if (price < 0.01) return `$${price.toFixed(4)}`;
  if (price < 1) return `$${price.toFixed(3)}`;
  return `$${price.toFixed(2)}`;
}

function formatTokens(tokens: number | undefined): string {
  if (tokens === undefined || tokens === null) return "—";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return tokens.toString();
}

function CopyableModelName({ name, className }: { name: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className={cn("group/copy inline-flex items-center gap-1", className)}>
      <span>{name}</span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover/copy:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <RiCheckLine className="size-3.5" />
        ) : (
          <RiFileCopyLine className="size-3.5" />
        )}
      </button>
    </span>
  );
}

function extractModels(catalog: ModelCatalog): ModelRow[] {
  const models: ModelRow[] = [];

  for (const [providerKey, providerInfo] of Object.entries(catalog)) {
    if (!providerInfo?.models) continue;

    const providerModels = providerInfo.models;
    const modelArray = Array.isArray(providerModels)
      ? providerModels
      : Object.values(providerModels);

    for (const model of modelArray) {
      // Extract company from model ID (e.g., "openai/o1-pro" -> "openai")
      const company = model.id.includes('/') 
        ? model.id.split('/')[0] 
        : providerKey;
      
      models.push({
        provider: providerKey,
        company,
        name: model.name || model.id,
        id: model.id,
        inputPrice: model.cost?.input,
        outputPrice: model.cost?.output,
        cacheReadPrice: model.cost?.cache_read,
        cacheWritePrice: model.cost?.cache_write,
        reasoningPrice: model.cost?.reasoning,
        contextSize: model.limit?.context,
        maxOutput: model.limit?.output,
        outputModalities: (model.modalities?.output as string[] | undefined) ?? [],
        releaseDate: model.release_date,
        knowledge: model.knowledge,
        hasReasoning: model.reasoning ?? false,
        hasToolCall: model.tool_call ?? false,
        hasAttachment: model.attachment ?? false,
        hasTemperature: model.temperature ?? false,
      });
    }
  }

  return models;
}

function getAllModelsWithPricing(models: ModelRow[]): ModelRow[] {
  // Return all models that have pricing data, excluding free models (0 input AND 0 output)
  return models.filter(
    (m) =>
      m.inputPrice !== undefined &&
      m.outputPrice !== undefined &&
      !(m.inputPrice === 0 && m.outputPrice === 0)
  );
}

const COLUMN_OPTIONS: { value: OptionalColumn; label: string }[] = [
  { value: "provider", label: "Provider" },
  { value: "releaseDate", label: "Release date" },
  { value: "knowledge", label: "Knowledge cutoff" },
  { value: "reasoningPrice", label: "Reasoning price" },
  { value: "capabilities", label: "Capability badges" },
];

const CAPABILITY_ICONS = [
  { key: "hasReasoning" as const, icon: Brain, label: "Reasoning" },
  { key: "hasToolCall" as const, icon: Wrench, label: "Tool calling" },
  { key: "hasAttachment" as const, icon: Paperclip, label: "File attachments" },
  { key: "hasTemperature" as const, icon: Thermometer, label: "Temperature control" },
];

function CapabilityBadges({ model }: { model: ModelRow }) {
  const caps = CAPABILITY_ICONS.filter((c) => model[c.key]);
  if (caps.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex items-center gap-1.5">
      {caps.map((cap) => (
        <Tooltip key={cap.key}>
          <TooltipTrigger asChild>
            <cap.icon className="size-3.5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{cap.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function ModelPricingTable() {
  const [models, setModels] = React.useState<ModelRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [providerFilter, setProviderFilter] = React.useState<string>("vercel");
  const [selectedCompanies, setSelectedCompanies] = React.useState<Set<string>>(new Set());
  const [capabilityFilter, setCapabilityFilter] = React.useState<CapabilityFilter>("text");
  const [sortField, setSortField] = React.useState<SortField>("input");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const [visibleColumns, setVisibleColumns] = React.useState<Set<OptionalColumn>>(
    new Set<OptionalColumn>(["capabilities"])
  );

  const toggleColumn = (col: OptionalColumn) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  };

  React.useEffect(() => {
    async function loadModels() {
      try {
        const catalog = await fetchModels();
        const allModels = extractModels(catalog);
        const modelsWithPricing = getAllModelsWithPricing(allModels);
        setModels(modelsWithPricing);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch models");
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, []);

  // Get all unique providers for the dropdown
  const providers = React.useMemo(() => {
    const uniqueProviders = [...new Set(models.map((m) => m.provider))];
    return uniqueProviders.sort();
  }, [models]);

  // Get models filtered by provider and capability (for company chips)
  const modelsFilteredByProviderAndCapability = React.useMemo(() => {
    let result = [...models];

    if (providerFilter !== "all") {
      result = result.filter((m) => m.provider === providerFilter);
    }

    if (capabilityFilter !== "all") {
      result = result.filter((m) => m.outputModalities.includes(capabilityFilter));
      
      if (capabilityFilter === "text") {
        const utilityPatterns = /embed|rerank|whisper|moderation|guard|classifier|detector|^bge[-\s]|^e5[-\s]|\/bge[-\s]|\/e5[-\s]/i;
        const imageGenPatterns = /flash-image|pro-image|image-preview|-image$/i;
        result = result.filter((m) => 
          !utilityPatterns.test(m.name) && 
          !utilityPatterns.test(m.id) &&
          !imageGenPatterns.test(m.id)
        );
      }
    }

    return result;
  }, [models, providerFilter, capabilityFilter]);

  // Priority companies to show first
  const PRIORITY_COMPANIES = ["openai", "google", "anthropic", "deepseek", "moonshotai"];

  // Available companies based on provider and capability filter, sorted with priority first
  const availableCompanies = React.useMemo(() => {
    const uniqueCompanies = [...new Set(modelsFilteredByProviderAndCapability.map((m) => m.company))];
    return uniqueCompanies.sort((a, b) => {
      const aIndex = PRIORITY_COMPANIES.indexOf(a);
      const bIndex = PRIORITY_COMPANIES.indexOf(b);
      // Both are priority: sort by priority order
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      // Only a is priority: a comes first
      if (aIndex !== -1) return -1;
      // Only b is priority: b comes first
      if (bIndex !== -1) return 1;
      // Neither is priority: sort alphabetically
      return a.localeCompare(b);
    });
  }, [modelsFilteredByProviderAndCapability]);

  const [showAllCompanies, setShowAllCompanies] = React.useState(false);
  const VISIBLE_COMPANY_COUNT = 8; // Show ~1 row of chips

  const visibleCompanies = showAllCompanies 
    ? availableCompanies 
    : availableCompanies.slice(0, VISIBLE_COMPANY_COUNT);

  const hasMoreCompanies = availableCompanies.length > VISIBLE_COMPANY_COUNT;

  const toggleCompany = (company: string) => {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(company)) {
        next.delete(company);
      } else {
        next.add(company);
      }
      return next;
    });
  };

  const filteredAndSortedModels = React.useMemo(() => {
    // Start with provider and capability filtered models
    let result = [...modelsFilteredByProviderAndCapability];

    // Filter by selected companies (if any are selected)
    if (selectedCompanies.size > 0) {
      result = result.filter((m) => selectedCompanies.has(m.company));
    }

    result.sort((a, b) => {
      let aVal: number | string | undefined;
      let bVal: number | string | undefined;

      switch (sortField) {
        case "input":
          aVal = a.inputPrice;
          bVal = b.inputPrice;
          break;
        case "output":
          aVal = a.outputPrice;
          bVal = b.outputPrice;
          break;
        case "context":
          aVal = a.contextSize;
          bVal = b.contextSize;
          break;
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
      }

      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [modelsFilteredByProviderAndCapability, selectedCompanies, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => (
    <span className="ml-1 opacity-50 group-hover:opacity-100 transition-opacity">
      {sortField === field ? (
        sortDirection === "asc" ? "↑" : "↓"
      ) : (
        <span className="opacity-0 group-hover:opacity-30">↕</span>
      )}
    </span>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="border border-destructive/50 bg-destructive/5 p-8 max-w-md">
          <h2 className="text-destructive font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Model Pricing
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Compare pricing across AI providers
            </p>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Provider
              </span>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All providers</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Capability
              </span>
              <Select value={capabilityFilter} onValueChange={(v) => setCapabilityFilter(v as CapabilityFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any capability</SelectItem>
                  <SelectItem value="text">Text generation</SelectItem>
                  <SelectItem value="image">Image generation</SelectItem>
                  <SelectItem value="audio">Audio generation</SelectItem>
                  <SelectItem value="video">Video generation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border bg-background text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
                  <Columns3 className="size-3.5" />
                  More columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52 p-1.5">
                {COLUMN_OPTIONS.map((col) => (
                  <label
                    key={col.value}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={visibleColumns.has(col.value)}
                      onCheckedChange={() => toggleColumn(col.value)}
                    />
                    {col.label}
                  </label>
                ))}
              </PopoverContent>
            </Popover>

            <div className="ml-auto text-xs text-muted-foreground">
              {filteredAndSortedModels.length} models
            </div>
          </div>

          {/* Company chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2">
              Company
            </span>
            {visibleCompanies.map((company) => (
              <button
                key={company}
                onClick={() => toggleCompany(company)}
                className={cn(
                  "px-3 py-1 text-xs font-medium border transition-colors inline-flex items-center gap-1.5",
                  selectedCompanies.has(company)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                <CompanyIcon company={company} className="size-3.5 shrink-0" />
                {company.charAt(0).toUpperCase() + company.slice(1)}
              </button>
            ))}
            {hasMoreCompanies && (
              <button
                onClick={() => setShowAllCompanies((prev) => !prev)}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAllCompanies ? "Show less" : `+${availableCompanies.length - VISIBLE_COMPANY_COUNT} more`}
              </button>
            )}
            {selectedCompanies.size > 0 && (
              <button
                onClick={() => setSelectedCompanies(new Set())}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <TooltipProvider>
        <div className="border border-border overflow-x-auto">
          <Table className="[&_[data-slot=table-container]]:overflow-visible">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead
                  className="cursor-pointer group sticky left-0 z-20 bg-zinc-900 shadow-[inset_-1px_0_0_hsl(var(--border))] w-[150px] sm:w-auto max-w-[150px] sm:max-w-none"
                  onClick={() => handleSort("name")}
                >
                  Model
                  <SortIndicator field="name" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer group"
                  onClick={() => handleSort("input")}
                >
                  Input
                  <SortIndicator field="input" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer group"
                  onClick={() => handleSort("output")}
                >
                  Output
                  <SortIndicator field="output" />
                </TableHead>
                <TableHead className="text-right">
                  <span className="text-muted-foreground">Cache</span>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer group"
                  onClick={() => handleSort("context")}
                >
                  Context
                  <SortIndicator field="context" />
                </TableHead>
                <TableHead className="text-right">Max Output</TableHead>
                {visibleColumns.has("reasoningPrice") && (
                  <TableHead className="text-right">Reasoning</TableHead>
                )}
                {visibleColumns.has("releaseDate") && (
                  <TableHead>Released</TableHead>
                )}
                {visibleColumns.has("knowledge") && (
                  <TableHead>Knowledge</TableHead>
                )}
                {visibleColumns.has("capabilities") && (
                  <TableHead>Capabilities</TableHead>
                )}
                {visibleColumns.has("provider") && (
                  <TableHead className="w-28">Provider</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedModels.map((model, idx) => (
                <TableRow
                  key={`${model.provider}-${model.id}`}
                  className="group hover:!bg-zinc-900"
                >
                  <TableCell className="font-medium sticky left-0 z-10 shadow-[inset_-1px_0_0_hsl(var(--border))] bg-background group-hover:bg-zinc-900 max-w-[150px] sm:max-w-none">
                    <div className="flex items-start gap-2.5">
                      <CompanyIcon company={model.company} className="size-5 mt-0.5 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{model.name}</span>
                        {model.name !== model.id && (
                          <CopyableModelName name={model.id} className="text-[10px] text-muted-foreground font-mono truncate" />
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatPrice(model.inputPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatPrice(model.outputPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {model.cacheReadPrice !== undefined ||
                    model.cacheWritePrice !== undefined ? (
                      <span className="text-[10px]">
                        R:{formatPrice(model.cacheReadPrice)} / W:
                        {formatPrice(model.cacheWritePrice)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatTokens(model.contextSize)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {formatTokens(model.maxOutput)}
                  </TableCell>
                  {visibleColumns.has("reasoningPrice") && (
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatPrice(model.reasoningPrice)}
                    </TableCell>
                  )}
                  {visibleColumns.has("releaseDate") && (
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(model.releaseDate)}
                    </TableCell>
                  )}
                  {visibleColumns.has("knowledge") && (
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(model.knowledge)}
                    </TableCell>
                  )}
                  {visibleColumns.has("capabilities") && (
                    <TableCell>
                      <CapabilityBadges model={model} />
                    </TableCell>
                  )}
                  {visibleColumns.has("provider") && (
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-wider",
                          "bg-muted"
                        )}
                      >
                        {model.provider}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </TooltipProvider>

        {/* Footer note */}
        <div className="mt-4 text-xs text-muted-foreground">
          <p>
            Data sourced from{" "}
            <a
              href="https://models.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              models.dev
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
