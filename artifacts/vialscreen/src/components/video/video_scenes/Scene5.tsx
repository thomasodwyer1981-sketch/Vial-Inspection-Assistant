import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// Scene 5: Result - PASS with relief/confidence
export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Giant PASS badge with pulse effect */}
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -45 }}
        animate={
          phase >= 1
            ? { scale: 1, rotate: 0 }
            : { scale: 0, rotate: -45 }
        }
        transition={{
          duration: 0.7,
          ease: [0.34, 1.56, 0.64, 1],
          type: "spring",
          stiffness: 200,
        }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 bg-[#00FF9D] rounded-full blur-3xl opacity-40"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Badge */}
        <div className="relative w-[35vw] h-[35vw] rounded-full border-8 border-[#00FF9D] bg-[#00FF9D]/10 backdrop-blur-sm flex items-center justify-center">
          <motion.p
            className="font-display font-black text-[#00FF9D] text-glow-green tracking-wider"
            style={{ fontSize: "10vw" }}
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            PASS
          </motion.p>
        </div>
      </motion.div>

      {/* Subtext */}
      <motion.p
        className="font-body text-white text-center font-semibold mt-8"
        style={{ fontSize: "4vw" }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        Safe for research use
      </motion.p>

      {/* Checkmark indicators */}
      <motion.div
        className="flex gap-4 mt-6"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-[#00FF9D]" />
          <p
            className="font-body text-[#94A3B8] font-medium"
            style={{ fontSize: "2.5vw" }}
          >
            No particles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-[#00FF9D]" />
          <p
            className="font-body text-[#94A3B8] font-medium"
            style={{ fontSize: "2.5vw" }}
          >
            Clear solution
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
