import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// Scene 4: Analysis - Animated progress with findings
export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1300),
      setTimeout(() => setPhase(4), 1800),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      {/* Title */}
      <motion.h3
        className="font-display font-bold text-[#FFB800] text-center mb-12 tracking-wide text-glow-amber"
        style={{ fontSize: "7vw" }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }
        }
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        ANALYZING
      </motion.h3>

      {/* Analysis items with checkmarks */}
      <div className="space-y-6 w-full max-w-[70vw]">
        {/* Contamination check */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="w-[4vw] h-[4vw] rounded-full border-2 border-[#00FF9D] flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={phase >= 2 ? { scale: 1 } : { scale: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.div
              className="w-[2vw] h-[2vw] rounded-full bg-[#00FF9D]"
              initial={{ scale: 0 }}
              animate={phase >= 2 ? { scale: 1 } : { scale: 0 }}
              transition={{ duration: 0.2, delay: 0.4 }}
            />
          </motion.div>
          <p
            className="font-body text-white font-medium"
            style={{ fontSize: "3.5vw" }}
          >
            Contamination scan
          </p>
        </motion.div>

        {/* Particle detection */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="w-[4vw] h-[4vw] rounded-full border-2 border-[#00FF9D] flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={phase >= 3 ? { scale: 1 } : { scale: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.div
              className="w-[2vw] h-[2vw] rounded-full bg-[#00FF9D]"
              initial={{ scale: 0 }}
              animate={phase >= 3 ? { scale: 1 } : { scale: 0 }}
              transition={{ duration: 0.2, delay: 0.4 }}
            />
          </motion.div>
          <p
            className="font-body text-white font-medium"
            style={{ fontSize: "3.5vw" }}
          >
            Particle detection
          </p>
        </motion.div>

        {/* Clarity analysis */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="w-[4vw] h-[4vw] rounded-full border-2 border-[#00FF9D] flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={phase >= 4 ? { scale: 1 } : { scale: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.div
              className="w-[2vw] h-[2vw] rounded-full bg-[#00FF9D]"
              initial={{ scale: 0 }}
              animate={phase >= 4 ? { scale: 1 } : { scale: 0 }}
              transition={{ duration: 0.2, delay: 0.4 }}
            />
          </motion.div>
          <p
            className="font-body text-white font-medium"
            style={{ fontSize: "3.5vw" }}
          >
            Clarity analysis
          </p>
        </motion.div>
      </div>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-[12vh] left-1/2 -translate-x-1/2 w-[70vw] h-[1vh] bg-[#1E293B]/50 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-[#FFB800] to-[#00FF9D]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
