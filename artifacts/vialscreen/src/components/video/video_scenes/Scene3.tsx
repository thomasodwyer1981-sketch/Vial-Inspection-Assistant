import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// Scene 3: Scan Process - Dual capture animation
export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2000),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Title */}
      <motion.p
        className="font-display font-semibold text-[#00FF9D] text-center mb-8 tracking-wider"
        style={{ fontSize: "3.5vw" }}
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
      >
        DUAL CAPTURE
      </motion.p>

      {/* Dual frame layout */}
      <div className="relative flex gap-4 mb-8">
        {/* Front view frame */}
        <motion.div
          className="relative w-[35vw] h-[50vh] rounded-lg border-2 border-[#00FF9D]/40 bg-[#1E293B]/30 backdrop-blur-sm overflow-hidden"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            src={`${import.meta.env.BASE_URL}images/vial-hero.png`}
            alt="Front"
            className="w-full h-full object-contain p-4"
          />
          <motion.p
            className="absolute bottom-2 left-1/2 -translate-x-1/2 font-body text-[#00FF9D] font-medium"
            style={{ fontSize: "2.5vw" }}
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.3 }}
          >
            FRONT
          </motion.p>
          {/* Scanning line */}
          {phase >= 3 && (
            <motion.div
              className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FF9D] to-transparent"
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: "50vh", opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.5, ease: "linear" }}
            />
          )}
        </motion.div>

        {/* Back view frame */}
        <motion.div
          className="relative w-[35vw] h-[50vh] rounded-lg border-2 border-[#00FF9D]/40 bg-[#1E293B]/30 backdrop-blur-sm overflow-hidden"
          initial={{ opacity: 0, x: 30 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
          transition={{
            duration: 0.6,
            delay: 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <img
            src={`${import.meta.env.BASE_URL}images/vial-hero.png`}
            alt="Back"
            className="w-full h-full object-contain p-4"
            style={{ transform: "scaleX(-1)" }}
          />
          <motion.p
            className="absolute bottom-2 left-1/2 -translate-x-1/2 font-body text-[#00FF9D] font-medium"
            style={{ fontSize: "2.5vw" }}
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.45 }}
          >
            BACK
          </motion.p>
          {/* Scanning line */}
          {phase >= 3 && (
            <motion.div
              className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FF9D] to-transparent"
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: "50vh", opacity: [0, 1, 1, 0] }}
              transition={{
                duration: 1.5,
                delay: 0.2,
                ease: "linear",
              }}
            />
          )}
        </motion.div>
      </div>

      {/* Status text */}
      <motion.p
        className="font-body text-white font-medium"
        style={{ fontSize: "3vw" }}
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        Scanning vial...
      </motion.p>
    </motion.div>
  );
}
