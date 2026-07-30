import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// Scene 6: Outro - Pro AI Vision feature + logo
export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1300),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Pro badge */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="px-6 py-2 rounded-full border-2 border-[#FFB800] bg-[#FFB800]/10 backdrop-blur-sm">
          <p
            className="font-display font-bold text-[#FFB800] tracking-wider"
            style={{ fontSize: "3vw" }}
          >
            PRO FEATURE
          </p>
        </div>
      </motion.div>

      {/* Headline */}
      <motion.h2
        className="font-display font-bold text-white text-center leading-tight mb-3"
        style={{ fontSize: "8vw" }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        AI Vision
      </motion.h2>

      {/* Subheadline */}
      <motion.p
        className="font-body text-[#94A3B8] text-center font-medium mb-6"
        style={{ fontSize: "3.5vw" }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{
          duration: 0.5,
          delay: 0.15,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        Powered by GPT-4o
      </motion.p>

      {/* Features list */}
      <motion.div
        className="space-y-3 mb-8"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-[1.5vw] h-[1.5vw] rounded-sm bg-[#00FF9D]" />
          <p
            className="font-body text-white font-medium"
            style={{ fontSize: "3vw" }}
          >
            Advanced defect detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-[1.5vw] h-[1.5vw] rounded-sm bg-[#00FF9D]" />
          <p
            className="font-body text-white font-medium"
            style={{ fontSize: "3vw" }}
          >
            Natural language insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-[1.5vw] h-[1.5vw] rounded-sm bg-[#00FF9D]" />
          <p
            className="font-body text-white font-medium"
            style={{ fontSize: "3vw" }}
          >
            Detailed quality reports
          </p>
        </div>
      </motion.div>

      {/* Logo/Brand lockup */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }
        }
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1
          className="font-display font-black text-[#00FF9D] tracking-tight text-glow-green"
          style={{ fontSize: "10vw" }}
        >
          PepScan
        </h1>
        <p
          className="font-body text-[#64748B] font-medium tracking-wider mt-1"
          style={{ fontSize: "2.5vw" }}
        >
          PEPTIDE QUALITY ASSURANCE
        </p>
      </motion.div>
    </motion.div>
  );
}
