import { AnimatePresence, motion } from "framer-motion";
import { useVideoPlayer } from "@/lib/video/hooks";
import { Scene1 } from "./video_scenes/Scene1";
import { Scene2 } from "./video_scenes/Scene2";
import { Scene3 } from "./video_scenes/Scene3";
import { Scene4 } from "./video_scenes/Scene4";
import { Scene5 } from "./video_scenes/Scene5";
import { Scene6 } from "./video_scenes/Scene6";

// Scene durations in milliseconds
const SCENE_DURATIONS = [3000, 3000, 5000, 4000, 3000, 3000];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer(SCENE_DURATIONS);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0A1628] noise-overlay">
      {/* Persistent background video - lab footage */}
      <motion.div
        className="absolute inset-0 z-0"
        animate={{
          opacity: currentScene <= 1 ? 0.3 : 0.15,
          scale: currentScene === 0 ? 1.05 : 1,
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <video
          src={`${import.meta.env.BASE_URL}videos/lab-bg.mp4`}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/80 via-[#0A1628]/60 to-[#0A1628]/90" />
      </motion.div>

      {/* Persistent hexagonal pattern overlay */}
      <motion.div
        className="absolute inset-0 z-10 opacity-10 mix-blend-overlay"
        animate={{
          opacity: currentScene === 3 ? 0.25 : 0.1,
        }}
        transition={{ duration: 0.8 }}
      >
        <div
          className="w-full h-full animate-rotate-slow"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}images/hex-pattern.png)`,
            backgroundSize: "50%",
            backgroundPosition: "center",
            backgroundRepeat: "repeat",
          }}
        />
      </motion.div>

      {/* Persistent ambient glow elements */}
      <motion.div
        className="absolute w-[80vh] h-[80vh] rounded-full blur-3xl"
        animate={{
          x: currentScene === 0 ? "20vw" : currentScene === 4 ? "50vw" : "10vw",
          y: currentScene === 0 ? "10vh" : currentScene === 4 ? "30vh" : "50vh",
          backgroundColor:
            currentScene === 4
              ? "rgba(0, 255, 157, 0.15)"
              : "rgba(255, 184, 0, 0.08)",
          scale: currentScene === 4 ? 1.5 : 1,
        }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        style={{ zIndex: 5 }}
      />

      {/* Scene content */}
      <div className="relative z-20 w-full h-full">
        <AnimatePresence mode="sync">
          {currentScene === 0 && <Scene1 key="scene1" />}
          {currentScene === 1 && <Scene2 key="scene2" />}
          {currentScene === 2 && <Scene3 key="scene3" />}
          {currentScene === 3 && <Scene4 key="scene4" />}
          {currentScene === 4 && <Scene5 key="scene5" />}
          {currentScene === 5 && <Scene6 key="scene6" />}
        </AnimatePresence>
      </div>

      {/* Persistent scanline effect - subtle */}
      <div
        className="absolute inset-0 z-30 pointer-events-none opacity-5"
        style={{
          background:
            "linear-gradient(0deg, transparent 0%, rgba(0,255,157,0.1) 50%, transparent 100%)",
          height: "2px",
          animation: "scanline 4s linear infinite",
        }}
      />
    </div>
  );
}
