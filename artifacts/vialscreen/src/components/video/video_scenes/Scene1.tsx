import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// Scene 1: Hook - "Visual screening for research vials"
export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 900),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Main headline with character stagger effect */}
      <motion.div className="text-center mb-6">
        <motion.h1
          className="font-display font-bold text-white leading-tight tracking-tight"
          style={{ fontSize: "11vw" }}
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Visual screening
        </motion.h1>
        <motion.h1
          className="font-display font-bold text-[#00FF9D] leading-tight tracking-tight text-glow-green"
          style={{ fontSize: "11vw" }}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={
            phase >= 1
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 30, scale: 0.9 }
          }
          transition={{
            duration: 0.8,
            delay: 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          for research vials
        </motion.h1>
      </motion.div>

      {/* Subline */}
      <motion.p
        className="font-body text-[#94A3B8] text-center font-medium"
        style={{ fontSize: "3.5vw" }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        AI-powered peptide inspection
      </motion.p>

      {/* Accent line */}
      <motion.div
        className="absolute bottom-[15vh] left-1/2 w-[40vw] h-[2px] bg-gradient-to-r from-transparent via-[#00FF9D] to-transparent"
        initial={{ scaleX: 0, x: "-50%" }}
        animate={
          phase >= 1 ? { scaleX: 1, x: "-50%" } : { scaleX: 0, x: "-50%" }
        }
        transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  );
}
