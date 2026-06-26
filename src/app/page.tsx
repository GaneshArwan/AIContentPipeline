"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PipelineStep } from "@/components/PipelineStep";
import { Stepper } from "@/components/Stepper";
import { PipelineState, AIProvider } from "@/types/pipeline";
import { exportContentPackage } from "@/lib/export";
import { 
  RefreshCw, 
  Sparkles, 
  Send, 
  ArrowRight, 
  BrainCircuit,
  Zap,
  Loader2,
  Rocket,
  Download,
  Key,
  Settings2,
  Link,
  PlayCircle
} from "lucide-react";
import { toast } from "sonner";

const INITIAL_STATE: PipelineState = {
  research: { status: 'pending' },
  outline: { status: 'pending' },
  draft: { status: 'pending' },
  seo: { status: 'pending' },
  social: { status: 'pending' },
};

export default function Home() {
  const [globalProvider, setGlobalProvider] = useState<AIProvider>("gemini");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localBaseUrl, setLocalBaseUrl] = useState("");
  const [isAutoRun, setIsAutoRun] = useState(false);
  
  const [stepProviders, setStepProviders] = useState<Record<keyof PipelineState, AIProvider>>({
    research: "gemini",
    outline: "gemini",
    draft: "gemini",
    seo: "gemini",
    social: "gemini",
  });
  
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
    gemini: "",
    openai: "",
    anthropic: "",
    local: ""
  });

  const [modelOverrides, setModelOverrides] = useState<Record<AIProvider, string>>({
    gemini: "",
    openai: "",
    anthropic: "",
    local: ""
  });
  
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [state, setState] = useState<PipelineState>(INITIAL_STATE);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const stepsOrder = ['research', 'outline', 'draft', 'seo', 'social'];

  const effectiveStepProviders = useMemo(() => {
    if (showAdvanced) return stepProviders;
    return {
      research: globalProvider,
      outline: globalProvider,
      draft: globalProvider,
      seo: globalProvider,
      social: globalProvider,
    };
  }, [showAdvanced, stepProviders, globalProvider]);

  const activeProviders = useMemo(() => {
    return Array.from(new Set(Object.values(effectiveStepProviders)));
  }, [effectiveStepProviders]);

  const needsLocalUrl = activeProviders.includes('local');

  const runStep = async (step: string, inputData: unknown) => {
    const currentProvider = effectiveStepProviders[step as keyof PipelineState];
    const currentApiKey = apiKeys[currentProvider];
    
    if (currentProvider !== 'local' && !currentApiKey?.trim()) {
      toast.error(`${currentProvider.toUpperCase()} API Key is required for step: ${step}.`);
      return;
    }

    setIsRunning(true);
    setCurrentStep(step);
    setState(prev => ({
      ...prev,
      [step]: { ...prev[step as keyof PipelineState], status: 'running' }
    }));

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        body: JSON.stringify({ 
          apiKeys,
          modelOverrides,
          stepProviders: effectiveStepProviders,
          localBaseUrl: needsLocalUrl ? localBaseUrl : undefined,
          topic, 
          context, 
          step, 
          input: inputData 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Request failed");
      }

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const eventStr = trimmed.substring(6); // Remove "data: "
            if (!eventStr) continue;

            const event = JSON.parse(eventStr);
            if (event.error) {
              throw new Error(event.error);
            }
            
            setState((prev) => ({
              ...prev,
              [event.step]: {
                status: event.status,
                output: event.data || prev[event.step as keyof PipelineState]?.output,
              },
            }));
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Step ${step} failed:`, errorMessage);
      setState(prev => ({
        ...prev,
        [step]: { ...prev[step as keyof PipelineState], status: 'error', error: errorMessage }
      }));
      toast.error(`Execution failed: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getNextStep = () => {
    if (!state.research.output) return 'research';
    if (!state.outline.output) return 'outline';
    if (!state.draft.output) return 'draft';
    if (!state.seo.output) return 'seo';
    if (!state.social.output) return 'social';
    return null;
  };

  const handleProceed = () => {
    const next = getNextStep();
    if (!next) return;

    // Industrial-grade validation for all upcoming steps
    const remainingSteps = stepsOrder.slice(stepsOrder.indexOf(next as string));
    const upcomingProviders = Array.from(new Set(remainingSteps.map(s => effectiveStepProviders[s as keyof PipelineState])));
    
    for (const p of upcomingProviders) {
      if (p === 'local') {
        if (!localBaseUrl?.trim()) {
          toast.error("Validation Error: Local Base URL is required when using a Local model.");
          return;
        }
        try {
          new URL(localBaseUrl);
        } catch {
          toast.error("Validation Error: Local Base URL must be a valid HTTP/HTTPS URL (e.g., http://localhost:1234/v1).");
          return;
        }
        continue;
      }

      const key = apiKeys[p as AIProvider]?.trim();
      const label = providers.find(prov => prov.id === p)?.label || p.toUpperCase();

      if (!key) {
        toast.error(`Validation Error: Missing API Key for ${label}. Please provide it to continue.`);
        return;
      }

      if (p === 'openai' && !key.startsWith('sk-')) {
        toast.error(`Validation Error: Invalid OpenAI Key. Standard OpenAI keys must start with 'sk-'.`);
        return;
      }

      if (p === 'anthropic' && !key.startsWith('sk-ant-')) {
        toast.error(`Validation Error: Invalid Anthropic Key. Standard Anthropic keys must start with 'sk-ant-'.`);
        return;
      }

      if (p === 'gemini' && !key.startsWith('AIza') && !key.startsWith('AQ')) {
        toast.error(`Validation Error: Invalid Gemini Key. Google API keys typically start with 'AIza' or 'AQ'.`);
        return;
      }
      
      if (key.length < 20) {
        toast.error(`Validation Error: The provided ${label} API key is suspiciously short and likely invalid.`);
        return;
      }
    }

    let input: unknown = { topic, context };
    if (next === 'outline') input = { topic, research: state.research.output };
    if (next === 'draft') input = { outline: state.outline.output };
    if (next === 'seo') input = { title: state.outline.output?.title, summary: state.draft.output?.content.slice(0, 2000) };
    if (next === 'social') input = { title: state.outline.output?.title, content: state.draft.output?.content };

    runStep(next, input);
  };

  const handleEdit = (step: keyof PipelineState, newOutput: unknown) => {
    setState(prev => ({
      ...prev,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [step]: { ...prev[step], output: newOutput as any }
    }));
  };

  const handleExport = async () => {
    await exportContentPackage(state, topic);
  };

  const resetPipeline = () => {
    setTopic("");
    setContext("");
    setState(INITIAL_STATE);
  };

  const steps = useMemo(() => [
    { title: "Research", status: state.research.status },
    { title: "Outline", status: state.outline.status },
    { title: "Draft", status: state.draft.status },
    { title: "SEO", status: state.seo.status },
    { title: "Social", status: state.social.status },
  ], [state]);

  const nextToRun = getNextStep();
  const isStarted = state.research.status !== 'pending';
  const allDone = !nextToRun && state.social.status === 'completed';

  useEffect(() => {
    if (isAutoRun && !isRunning && isStarted && !allDone && nextToRun) {
      handleProceed();
    }
  }, [isRunning, isStarted, allDone, isAutoRun]); // eslint-disable-line react-hooks/exhaustive-deps

  const providers: { id: AIProvider; label: string }[] = [
    { id: 'gemini', label: 'Gemini' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'local', label: 'Local' },
  ];

  return (
    <div className="min-h-screen relative text-emerald-50 selection:bg-emerald-500/30 selection:text-emerald-100">
      <div className="mesh-gradient" />

      <div className="relative max-w-5xl mx-auto px-6 py-12 sm:py-20">
        {/* Header */}
        <header className="flex flex-col items-center text-center mb-12 space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase mb-2"
          >
            <Sparkles className="w-3 h-3" /> AIContentPipeline
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-7xl font-black tracking-tighter shimmer-text"
          >
            AIContent<span className="text-emerald-500">Pipeline</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl text-lg text-emerald-100/70 font-medium leading-relaxed"
          >
            Content generation pipeline for multi-channel workflows.
          </motion.p>
        </header>

        {/* Main Stepper */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <Stepper steps={steps} />
        </motion.div>

        {/* Input Area (The Stage) */}
        <section 
          className="mb-16"
          aria-live="polite"
          aria-busy={isRunning}
        >
          <motion.div 
            layout
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            className={`glass-card rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-500 ${isStarted ? 'glow-accent border-emerald-500/20' : ''}`}
          >
            <div className="absolute top-0 right-0 p-8 text-emerald-500 pointer-events-none">
              <BrainCircuit className="w-32 h-32 opacity-[0.05]" />
            </div>

            <div className="relative space-y-8">
              <AnimatePresence mode="wait">
                {!isStarted ? (
                  <motion.div 
                    key="input-fields"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-1 gap-8"
                  >
                    <div className="space-y-3">
                      <label htmlFor="globalProvider" className="text-xs font-bold text-emerald-500/50 uppercase tracking-[0.2em] ml-1">
                        Primary Provider
                      </label>
                      <div className="relative group">
                        <select
                          id="globalProvider"
                          value={globalProvider}
                          onChange={(e) => {
                            const newProvider = e.target.value as AIProvider;
                            setGlobalProvider(newProvider);
                            setStepProviders({
                              research: newProvider,
                              outline: newProvider,
                              draft: newProvider,
                              seo: newProvider,
                              social: newProvider,
                            });
                            setShowAdvanced(false);
                          }}
                          className="glass-input w-full rounded-2xl py-5 px-7 text-lg font-medium text-emerald-50 outline-none appearance-none cursor-pointer group-hover:bg-emerald-950/40"
                          disabled={isRunning}
                        >
                          {providers.map(p => (
                            <option key={p.id} value={p.id} className="bg-emerald-950 text-emerald-400">
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500/40 pointer-events-none group-focus-within:text-emerald-400 transition-colors">
                          <Settings2 className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <button 
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-xs font-bold text-emerald-500/70 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                      >
                        <Settings2 className="w-4 h-4" />
                        {showAdvanced ? "Hide Per-Step Configuration" : "Configure Per Step"}
                      </button>
                      
                      <AnimatePresence>
                        {showAdvanced && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                              {stepsOrder.map((step) => {
                                const currentProviderId = stepProviders[step as keyof PipelineState];
                                return (
                                  <div key={step} className="flex flex-col gap-2 p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/10 relative group hover:border-emerald-500/30 transition-colors">
                                     <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">{step}</span>
                                     <select
                                       value={currentProviderId}
                                       onChange={(e) => setStepProviders(prev => ({ ...prev, [step]: e.target.value as AIProvider }))}
                                       className="w-full bg-transparent text-emerald-400 text-xs font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer"
                                     >
                                       {providers.map(p => (
                                         <option key={p.id} value={p.id} className="bg-emerald-950 text-emerald-400">
                                           {p.label}
                                         </option>
                                       ))}
                                     </select>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* API Keys and Base URL */}
                    {activeProviders.length > 0 && (
                      <div className="space-y-4 p-5 rounded-2xl bg-emerald-950/10 border border-emerald-500/10">
                        {activeProviders.map((prov) => {
                          const providerLabel = providers.find(p => p.id === prov)?.label;
                          return (
                            <div key={prov} className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/10 space-y-4 transition-all hover:bg-emerald-950/30">
                              <div className="flex items-center justify-between border-b border-emerald-500/10 pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                                  <span className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest">
                                    {providerLabel} Configuration
                                  </span>
                                </div>
                                <button 
                                  onClick={() => setApiKeys(prev => ({ ...prev, [prov]: "" }))}
                                  className="text-[10px] text-emerald-500/50 hover:text-emerald-400 font-bold uppercase tracking-widest transition-colors"
                                >
                                  Clear Key
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label htmlFor={`apiKey-${prov}`} className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Key className="w-3 h-3" />
                                    API Key {prov === 'local' && <span className="text-emerald-500/30">(Optional)</span>}
                                  </label>
                                  <div className="relative group">
                                    <input
                                      type="password"
                                      id={`apiKey-${prov}`}
                                      autoComplete="off"
                                      spellCheck={false}
                                      className="glass-input w-full rounded-xl py-2.5 px-4 text-sm text-emerald-50 font-mono placeholder:text-emerald-900/50 group-hover:bg-emerald-950/40"
                                      placeholder={prov === 'local' ? `Local API key...` : `Paste ${providerLabel} key...`}
                                      value={apiKeys[prov as AIProvider]}
                                      onChange={(e) => setApiKeys(prev => ({ ...prev, [prov as AIProvider]: e.target.value }))}
                                      disabled={isRunning}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label htmlFor={`modelOverride-${prov}`} className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Settings2 className="w-3 h-3" />
                                    Model Override <span className="text-emerald-500/30">(Optional)</span>
                                  </label>
                                  <div className="relative group">
                                    <input
                                      type="text"
                                      id={`modelOverride-${prov}`}
                                      autoComplete="off"
                                      spellCheck={false}
                                      className="glass-input w-full rounded-xl py-2.5 px-4 text-sm text-emerald-50 font-mono placeholder:text-emerald-900/40 group-hover:bg-emerald-950/40"
                                      placeholder={`e.g. gpt-4o or llama3.2`}
                                      value={modelOverrides[prov as AIProvider]}
                                      onChange={(e) => setModelOverrides(prev => ({ ...prev, [prov as AIProvider]: e.target.value }))}
                                      disabled={isRunning}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {needsLocalUrl && (
                          <div className="space-y-3">
                            <label htmlFor="localBaseUrl" className="text-xs font-bold text-emerald-500/50 uppercase tracking-[0.2em] ml-1">
                              Local Base URL (OpenAI Compatible)
                            </label>
                            <div className="relative group">
                              <input
                                type="url"
                                id="localBaseUrl"
                                className="glass-input w-full rounded-2xl py-3 px-6 text-emerald-50 font-mono placeholder:text-emerald-900/50 group-hover:bg-emerald-950/40"
                                placeholder="e.g. http://localhost:11434/v1 or http://localhost:1234/v1"
                                value={localBaseUrl}
                                onChange={(e) => setLocalBaseUrl(e.target.value)}
                                disabled={isRunning}
                              />
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500/40 group-focus-within:text-emerald-400 transition-colors">
                                <Link className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        )}

                        <p className="text-[10px] text-emerald-900/60 font-medium px-1">
                          Held strictly in RAM. Never stored on disk or server.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label htmlFor="topic" className="text-xs font-bold text-emerald-500/50 uppercase tracking-[0.2em] ml-1">
                        Generation Topic
                      </label>
                      <div className="relative group">
                        <input
                          type="text"
                          id="topic"
                          className="glass-input w-full rounded-2xl py-5 px-7 text-xl font-medium placeholder:text-emerald-900/50 text-emerald-50 group-hover:bg-emerald-950/40"
                          placeholder="e.g., The Architecture of Modern AI Pipelines"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          disabled={isRunning}
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500/40 group-focus-within:text-emerald-400 transition-colors">
                          <Zap className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label htmlFor="context" className="text-xs font-bold text-emerald-500/50 uppercase tracking-[0.2em] ml-1">
                        Additional Context <span className="text-emerald-800 font-medium normal-case ml-1">(Optional)</span>
                      </label>
                      <textarea
                        id="context"
                        rows={3}
                        className="glass-input w-full rounded-2xl py-5 px-7 text-lg font-medium placeholder:text-emerald-900/50 text-emerald-50 resize-none group-hover:bg-emerald-950/40"
                        placeholder="Define specific constraints, target audience, or brand voice..."
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        disabled={isRunning}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="active-status"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex items-center justify-between p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/20"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                        <Rocket className="w-8 h-8 animate-float" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-400/60 uppercase tracking-widest mb-1">
                          Active Execution ({currentStep ? effectiveStepProviders[currentStep as keyof PipelineState] : 'Initializing'})
                        </p>
                        <h3 className="text-2xl font-bold text-white tracking-tight">{topic}</h3>
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-bold text-emerald-700 uppercase">Process Status</span>
                        <div className="text-xl font-mono font-bold text-emerald-400">
                          {stepsOrder.indexOf(nextToRun || 'social') + (allDone ? 1 : 0)} / 5
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex flex-col gap-4 pt-2">
                {!allDone && (
                  <label className="flex items-center justify-center sm:justify-end gap-3 cursor-pointer group select-none">
                    <span className="text-xs font-bold text-emerald-500/70 group-hover:text-emerald-400 uppercase tracking-widest transition-colors flex items-center gap-2">
                      <PlayCircle className="w-4 h-4" />
                      Auto-Execute Pipeline
                    </span>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={isAutoRun}
                        onChange={(e) => setIsAutoRun(e.target.checked)}
                        disabled={isRunning}
                      />
                      <div className={`w-11 h-6 bg-emerald-950/40 border border-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-emerald-400 after:border-emerald-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                    </div>
                  </label>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {!allDone && (
                    <button
                      onClick={handleProceed}
                      disabled={isRunning || (!topic && nextToRun === 'research')}
                      className={`
                        relative group flex-1 flex items-center justify-center gap-3 py-5 px-8 rounded-2xl text-lg font-bold transition-all duration-500 overflow-hidden
                        ${isRunning || (!topic && nextToRun === 'research') 
                          ? 'bg-white/5 text-emerald-900 cursor-not-allowed border border-white/5' 
                          : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-1 active:translate-y-0 border border-emerald-400/20'}
                      `}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      {isRunning ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="animate-pulse">Processing {currentStep}...</span>
                        </>
                      ) : (
                        <>
                          {nextToRun === 'research' ? <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                          <span>{nextToRun === 'research' ? 'Initialize Pipeline' : `Execute ${nextToRun}`}</span>
                        </>
                      )}
                    </button>
                  )}

                {allDone && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-1 gap-4"
                  >
                    <button
                      onClick={handleExport}
                      className="flex-1 flex justify-center items-center gap-3 py-5 px-8 rounded-2xl text-lg font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1 active:translate-y-0 border border-emerald-400/20"
                    >
                      <Download className="w-6 h-6" /> Export Content Package
                    </button>
                    <button
                      onClick={resetPipeline}
                      className="flex justify-center items-center gap-3 py-5 px-8 rounded-2xl text-lg font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/10 hover:bg-emerald-900/40 transition-all active:scale-95"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </motion.div>
                )}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Steps History */}
        <div className="space-y-10">
          <div className="flex items-center gap-4 px-2">
            <h2 className="text-2xl font-black tracking-tight text-white">Pipeline <span className="text-emerald-800 font-medium tracking-normal">Log</span></h2>
            <div className="h-px bg-emerald-500/10 flex-1" />
          </div>
          
          <div className="space-y-8">
            <AnimatePresence initial={false}>
              {stepsOrder.map((step, idx) => (
                <motion.div 
                  key={step} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative"
                >
                  {idx < stepsOrder.length - 1 && (
                    <div className={`absolute left-[2.4rem] top-20 bottom-0 w-px bg-emerald-500/5 transition-colors duration-1000 ${state[step as keyof PipelineState].status === 'completed' ? 'bg-emerald-500/20' : ''}`} />
                  )}
                  <PipelineStep 
                    title={step.charAt(0).toUpperCase() + step.slice(1)} 
                    status={state[step as keyof PipelineState].status} 
                    output={state[step as keyof PipelineState].output}
                    onEdit={(newOutput) => handleEdit(step as keyof PipelineState, newOutput)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 text-center text-emerald-900 text-[10px] font-black uppercase tracking-[0.4em] relative z-10">
          <p>© {new Date().getFullYear()} AIContentPipeline.</p>
        </footer>
      </div>
    </div>
  );
}
