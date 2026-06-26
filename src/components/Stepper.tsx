import { PipelineStepStatus } from "@/types/pipeline";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StepperProps {
  steps: { title: string; status: PipelineStepStatus }[];
}

export function Stepper({ steps }: StepperProps) {
  // Calculate completion percentage for the progress track
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = (completedCount / (steps.length - 1)) * 100;

  return (
    <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto py-8">
      {/* Background Track */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-emerald-950/20 -translate-y-1/2 z-0 rounded-full" />
      
      {/* Active Progress Track */}
      <motion.div 
        className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]"
        initial={{ width: "0%" }}
        animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
      />
      
      {steps.map((step, index) => {
        const isCompleted = step.status === 'completed';
        const isRunning = step.status === 'running';
        const isError = step.status === 'error';

        return (
          <div key={index} className="relative z-10 flex flex-col items-center">
            <motion.div 
              initial={false}
              animate={{
                scale: isRunning ? 1.2 : 1,
                backgroundColor: isCompleted ? "rgb(16, 185, 129)" : isRunning ? "rgba(6, 78, 59, 0.4)" : "rgb(2, 6, 23)",
                borderColor: isCompleted ? "rgb(16, 185, 129)" : isRunning ? "rgb(52, 211, 153)" : "rgba(16, 185, 129, 0.1)",
              }}
              className={`
                w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2
                ${isCompleted ? 'shadow-[0_0_20px_rgba(16,185,129,0.3)]' : ''}
                ${isRunning ? 'shadow-[0_0_20px_rgba(52,211,153,0.2)]' : ''}
              `}
            >
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="w-6 h-6 text-white stroke-[3px]" />
                  </motion.div>
                ) : isRunning ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  </motion.div>
                ) : isError ? (
                  <motion.div
                    key="error"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <AlertCircle className="w-6 h-6 text-rose-400" />
                  </motion.div>
                ) : (
                  <motion.span 
                    key="index"
                    className="text-sm font-bold text-emerald-900/50"
                  >
                    {index + 1}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
            
            <div className="absolute top-16 flex flex-col items-center">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 whitespace-nowrap ${
                isRunning ? 'text-emerald-400' : 
                isCompleted ? 'text-emerald-200' : 
                'text-emerald-900/40'
              }`}>
                {step.title}
              </span>
              <AnimatePresence>
                {isRunning && (
                  <motion.div 
                    layoutId="active-dot"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="h-1 w-4 bg-emerald-500 rounded-full mt-1 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
