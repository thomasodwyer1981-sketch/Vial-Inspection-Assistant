import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// Scene 2: Problem - "Spot visible concerns before use"
export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Vial hero image */}
      <motion.div
        className="relative mb-8"
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={
          phase >= 1
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.8, y: 30 }
        }
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <img
          src={`${import.meta.env.BASE_URL}images/vial-hero.png`}
          alt="Peptide vial"
          className="w-[28vw] h-auto object-contain"
        />
        {/* Amber warning glow */}
        <motion.div
          className="absolute inset-0 bg-[#FFB800] rounded-full blur-3xl opacity-30"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={
            phase >= 1
              ? { scale: 1.2, opacity: 0.3 }
              : { scale: 0.5, opacity: 0 }
          }
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </motion.div>

      {/* Headline */}
      <motion.h2
        className="font-display font-bold text-white text-center leading-tight tracking-tight mb-2"
        style={{ fontSize: "7.5vw" }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        Spot visible
      </motion.h2>
      <motion.h2
        className="font-display font-bold text-[#FFB800] text-center leading-tight tracking-tight text-glow-amber"
        style={{ fontSize: "7.5vw" }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{
          duration: 0.5,
          delay: 0.15,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        concerns early
      </motion.h2>
    </motion.div>
  );
}
