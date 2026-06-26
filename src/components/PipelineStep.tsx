import { useState } from "react";
import { 
  PipelineStepStatus, 
  ResearchOutput, 
  OutlineOutput, 
  DraftOutput, 
  SEOOutput, 
  SocialOutput 
} from "@/types/pipeline";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  AlertCircle, 
  Edit3, 
  Check, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Layout,
  Search,
  Hash,
  Share2,
  Sparkles,
  List,
  BarChart3,
  Lightbulb,
  Twitter,
  Linkedin,
  Mail,
  Globe,
  Tag,
  Copy
} from "lucide-react";

interface PipelineStepProps {
  title: string;
  status: PipelineStepStatus;
  output?: unknown;
  onEdit?: (newOutput: unknown) => void;
}

export function PipelineStep({ title, status, output, onEdit }: PipelineStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [editedOutput, setEditedOutput] = useState("");

  const handleEdit = () => {
    const name = title.toLowerCase();
    if (name.includes("draft") && typeof output === 'object' && output !== null && 'content' in output) {
      setEditedOutput((output as DraftOutput).content);
    } else {
      setEditedOutput(typeof output === 'string' ? output : JSON.stringify(output, null, 2));
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    try {
      const name = title.toLowerCase();
      if (name.includes("draft") && typeof output === 'object' && output !== null && 'content' in output) {
        onEdit?.({ ...(output as object), content: editedOutput });
      } else {
        const parsed = typeof output === 'string' ? editedOutput : JSON.parse(editedOutput);
        onEdit?.(parsed);
      }
      setIsEditing(false);
      toast.success("Changes saved to output");
    } catch {
      toast.error("Invalid JSON format. Please check your structure.");
    }
  };

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`Copied ${label} to clipboard`);
    } else {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getStepIcon = () => {
    const name = title.toLowerCase();
    const iconClass = "w-5 h-5 transition-transform duration-500 group-hover:scale-110";
    if (name.includes("research")) return <Search className={iconClass} />;
    if (name.includes("outline")) return <Layout className={iconClass} />;
    if (name.includes("draft")) return <FileText className={iconClass} />;
    if (name.includes("seo")) return <Hash className={iconClass} />;
    if (name.includes("social")) return <Share2 className={iconClass} />;
    return <Circle className={iconClass} />;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />;
      case 'running': return <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default: return <Circle className="w-4 h-4 text-emerald-900/50" />;
    }
  };

  const renderResearch = (data: ResearchOutput) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/5 space-y-3 relative group/card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <List className="w-4 h-4" /> Key Points
            </div>
            <button 
              onClick={() => handleCopy(data.keyPoints.join("\n"), "Key Points")}
              className="opacity-0 group-hover/card:opacity-100 p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-700 hover:text-emerald-400 transition-all"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <ul className="space-y-2">
            {data.keyPoints.map((item, i) => (
              <li key={i} className="text-sm text-emerald-100/70 leading-relaxed flex gap-2">
                <span className="text-emerald-500 font-bold">•</span> 
                <div className="prose prose-sm prose-invert max-w-none prose-p:m-0 prose-strong:text-emerald-300">
                  <ReactMarkdown components={{ p: 'span' }}>{item}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/5 space-y-3 relative group/card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <BarChart3 className="w-4 h-4" /> Statistics
            </div>
            <button 
              onClick={() => handleCopy(data.statistics.join("\n"), "Statistics")}
              className="opacity-0 group-hover/card:opacity-100 p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-700 hover:text-emerald-400 transition-all"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <ul className="space-y-2">
            {data.statistics.map((item, i) => (
              <li key={i} className="text-sm text-emerald-100/70 leading-relaxed flex gap-2">
                <span className="text-emerald-500 font-bold">•</span> 
                <div className="prose prose-sm prose-invert max-w-none prose-p:m-0 prose-strong:text-emerald-300">
                  <ReactMarkdown components={{ p: 'span' }}>{item}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="p-4 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/5 space-y-3 relative group/card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Lightbulb className="w-4 h-4" /> Subtopics
          </div>
          <button 
            onClick={() => handleCopy(data.subtopics.join(", "), "Subtopics")}
            className="opacity-0 group-hover/card:opacity-100 p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-700 hover:text-emerald-400 transition-all"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.subtopics.map((item, i) => (
            <span key={i} className="px-3 py-1 rounded-full bg-emerald-500/5 text-emerald-400 text-xs border border-emerald-500/10 prose-strong:text-emerald-300">
              <ReactMarkdown components={{ p: 'span' }}>{item}</ReactMarkdown>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOutline = (data: OutlineOutput) => (
    <div className="space-y-6 relative group/card">
      <div className="flex items-start justify-between">
        <h4 className="text-xl font-bold text-emerald-50 tracking-tight leading-tight">{data.title}</h4>
        <button 
          onClick={() => handleCopy(`${data.title}\n\n${data.sections.map(s => `${s.heading}\n${s.points.map(p => `- ${p}`).join("\n")}`).join("\n\n")}`, "Outline")}
          className="opacity-0 group-hover/card:opacity-100 p-2 hover:bg-emerald-500/10 rounded-xl text-emerald-700 hover:text-emerald-400 transition-all"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-4">
        {data.sections.map((section, i) => (
          <div key={i} className="relative pl-6 border-l border-emerald-500/10 space-y-2 group/section">
            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500 group-hover/section:scale-125 transition-transform" />
            <h5 className="font-bold text-emerald-400">{section.heading}</h5>
            <ul className="space-y-1">
              {section.points.map((point, j) => (
                <li key={j} className="text-sm text-emerald-100/60 leading-relaxed flex gap-2">
                  <span className="text-emerald-500/50">•</span>
                  <div className="prose prose-sm prose-invert max-w-none prose-p:m-0 prose-strong:text-emerald-300">
                    <ReactMarkdown components={{ p: 'span' }}>{point}</ReactMarkdown>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDraft = (data: DraftOutput) => (
    <div className="relative group/card">
      <div className="absolute top-0 right-0 z-20">
        <button 
          onClick={() => handleCopy(data.content, "Full Draft")}
          className="opacity-0 group-hover/card:opacity-100 p-2 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl text-emerald-700 hover:text-emerald-400 border border-emerald-500/10 transition-all"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-emerald-400 prose-strong:text-emerald-50 prose-p:text-emerald-100/80 prose-li:text-emerald-100/80">
        <ReactMarkdown>{data.content}</ReactMarkdown>
      </div>
    </div>
  );

  const renderSEO = (data: SEOOutput) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-full p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2 relative group/card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <Globe className="w-3 h-3" /> Search Title
          </div>
          <button 
            onClick={() => handleCopy(data.title, "SEO Title")}
            className="opacity-0 group-hover/card:opacity-100 p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-700 hover:text-emerald-400 transition-all"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="text-emerald-50 font-bold">{data.title}</div>
      </div>
      <div className="p-4 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/5 space-y-2 relative group/card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 text-[10px] font-black uppercase tracking-widest">
            <FileText className="w-3 h-3" /> Meta Description
          </div>
          <button 
            onClick={() => handleCopy(data.metaDescription, "Meta Description")}
            className="opacity-0 group-hover/card:opacity-100 p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-700 hover:text-emerald-400 transition-all"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="text-sm text-emerald-100/70 leading-relaxed">{data.metaDescription}</div>
      </div>
      <div className="p-4 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/5 space-y-2 relative group/card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 text-[10px] font-black uppercase tracking-widest">
            <Link className="w-3 h-3" /> URL Slug
          </div>
          <button 
            onClick={() => handleCopy(data.slug, "URL Slug")}
            className="opacity-0 group-hover/card:opacity-100 p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-700 hover:text-emerald-400 transition-all"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="text-sm font-mono text-emerald-400">/{data.slug}</div>
      </div>
      <div className="col-span-full p-4 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/5 space-y-3 relative group/card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 text-[10px] font-black uppercase tracking-widest">
            <Tag className="w-3 h-3" /> Keywords
          </div>
          <button 
            onClick={() => handleCopy(data.keywords.join(", "), "Keywords")}
            className="opacity-0 group-hover/card:opacity-100 p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-700 hover:text-emerald-400 transition-all"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.keywords.map((kw, i) => (
            <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-500/5 text-emerald-600 text-[11px] border border-emerald-500/10">
              #{kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSocial = (data: SocialOutput) => (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <Twitter className="w-3 h-3" /> Twitter Thread
          </div>
          <button 
            onClick={() => handleCopy(data.twitterThread.join("\n\n"), "Twitter Thread")}
            className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-700 hover:text-emerald-400 transition-all"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {data.twitterThread.map((tweet, i) => (
            <div key={i} className="p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 text-sm text-emerald-50">
              <span className="text-emerald-500 font-mono mr-2">{i + 1}/</span>
              <div className="prose prose-sm prose-invert max-w-none mt-2 prose-p:leading-relaxed prose-strong:text-emerald-300">
                <ReactMarkdown>{tweet}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 space-y-3 relative group/card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <Linkedin className="w-3 h-3" /> LinkedIn Post
          </div>
          <button 
            onClick={() => handleCopy(data.linkedInPost, "LinkedIn Post")}
            className="opacity-0 group-hover/card:opacity-100 p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-700 hover:text-emerald-400 transition-all"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="text-sm text-emerald-50 leading-relaxed">
          <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-strong:text-emerald-300">
            <ReactMarkdown>{data.linkedInPost}</ReactMarkdown>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
            <Mail className="w-3 h-3" /> Email Subjects
          </div>
          <button 
            onClick={() => handleCopy(data.emailSubjectLines.join("\n"), "Email Subjects")}
            className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-700 hover:text-emerald-400 transition-all"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {data.emailSubjectLines.map((subject, i) => (
            <div key={i} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-sm text-emerald-50 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {subject}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOutput = () => {
    if (!output) return null;
    const name = title.toLowerCase();
    
    try {
      if (name.includes("research")) return renderResearch(output as ResearchOutput);
      if (name.includes("outline")) return renderOutline(output as OutlineOutput);
      if (name.includes("draft")) return renderDraft(output as DraftOutput);
      if (name.includes("seo")) return renderSEO(output as SEOOutput);
      if (name.includes("social")) return renderSocial(output as SocialOutput);
    } catch {
      return (
        <pre className="text-xs font-mono text-rose-400 leading-relaxed">
          Error rendering output format. Showing raw data:
          {JSON.stringify(output, null, 2)}
        </pre>
      );
    }

    return (
      <pre className="text-xs font-mono text-emerald-400/70 leading-relaxed">
        {JSON.stringify(output, null, 2)}
      </pre>
    );
  };

  const isPending = status === 'pending';
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';

  return (
    <motion.div 
      layout
      initial={false}
      className={`
        group relative glass-card rounded-3xl transition-all duration-500 overflow-hidden
        ${isRunning ? 'glow-emerald border-emerald-500/20 bg-emerald-950/40' : 'hover:bg-emerald-950/40'}
        ${isPending ? 'opacity-40 grayscale' : 'opacity-100'}
      `}
    >
      <AnimatePresence>
        {isRunning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 animate-shimmer pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div 
        className="flex items-center justify-between p-6 select-none cursor-pointer relative z-10" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-5">
          <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
            ${isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10' : 
              isRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
              'bg-emerald-950/20 text-emerald-900 border border-emerald-500/5'}
          `}>
            {getStepIcon()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-50 tracking-tight">
              {title}
            </h3>
            <div className="flex items-center gap-2.5 mt-1">
              {getStatusIcon()}
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                isCompleted ? 'text-emerald-400/80' : 
                isRunning ? 'text-emerald-400' : 
                'text-emerald-900/60'
              }`}>
                {status}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isCompleted && !isEditing && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); handleEdit(); }}
              className="p-2.5 bg-emerald-500/5 hover:bg-emerald-500/20 rounded-xl text-emerald-700 hover:text-emerald-400 border border-emerald-500/5 hover:border-emerald-500/20 transition-all"
              title="Edit output"
            >
              <Edit3 className="w-4 h-4" />
            </motion.button>
          )}
          <div className={`p-1 rounded-full transition-colors ${isOpen ? 'text-emerald-400' : 'text-emerald-900/60 group-hover:text-emerald-700'}`}>
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (output || isEditing || isRunning) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="px-6 pb-6 relative z-10"
          >
            <div className="h-px bg-emerald-500/5 mb-6" />
            
            {isEditing ? (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-4"
              >
                <div className="relative">
                  <textarea
                    className="w-full p-6 bg-emerald-950/40 rounded-2xl border border-emerald-500/20 text-emerald-50 font-mono text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/40 outline-none transition-all min-h-[400px] scrollbar-thin"
                    value={editedOutput}
                    onChange={(e) => setEditedOutput(e.target.value)}
                    spellCheck={false}
                  />
                  <div className="absolute top-4 right-4 text-[10px] font-bold text-emerald-500/20 uppercase tracking-widest pointer-events-none">
                    Data Editor
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 text-sm font-bold text-emerald-800 hover:text-emerald-100 transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button 
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Update Output
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="relative group/output">
                {!output && isRunning ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400/60 animate-pulse">Processing...</p>
                  </div>
                ) : (
                  <div className="bg-emerald-950/20 rounded-2xl border border-emerald-500/5 p-6 overflow-x-auto max-h-[600px] scrollbar-thin relative">
                    {renderOutput()}
                    
                    {/* Floating Step Indicator */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover/output:opacity-100 transition-opacity pointer-events-none">
                       <span className="text-[10px] font-black text-emerald-500/20 uppercase tracking-[0.3em]">{title} Result</span>
                    </div>
                  </div>
                )}
                
                {isCompleted && (
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none rounded-b-2xl opacity-40" />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Missing icon in the previous scope
const Link = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
