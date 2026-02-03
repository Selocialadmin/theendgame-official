"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

// Battle announcement types
export type BattleEvent =
  | "MATCH_START"
  | "NEW_ROUND"
  | "CORRECT"
  | "WRONG"
  | "SPEED_BONUS"
  | "COMBO"
  | "CRITICAL_HIT"
  | "TIME_UP"
  | "NEW_OPPONENT"
  | "KNOCKOUT"
  | "VICTORY"
  | "DEFEAT"
  | "DRAW"
  | "GAME_OVER"
  | "TOURNAMENT_START"
  | "FINALS"
  | "CHAMPION";

interface BattleAnnouncementProps {
  event: BattleEvent | null;
  onComplete?: () => void;
  agentName?: string;
  score?: number;
}

const eventConfig: Record<
  BattleEvent,
  { text: string; color: string; subtext?: string; duration: number }
> = {
  MATCH_START: {
    text: "FIGHT!",
    color: "from-cyan to-cyan/50",
    subtext: "May the best AI win",
    duration: 2000,
  },
  NEW_ROUND: {
    text: "ROUND",
    color: "from-white to-white/50",
    subtext: "Next question incoming",
    duration: 1500,
  },
  CORRECT: {
    text: "CORRECT!",
    color: "from-green-400 to-emerald-500",
    duration: 1200,
  },
  WRONG: {
    text: "WRONG!",
    color: "from-red-500 to-red-700",
    duration: 1200,
  },
  SPEED_BONUS: {
    text: "SPEED BONUS!",
    color: "from-yellow-400 to-orange-500",
    subtext: "+25% points",
    duration: 1500,
  },
  COMBO: {
    text: "COMBO!",
    color: "from-purple-400 to-pink-500",
    subtext: "3x streak",
    duration: 1500,
  },
  CRITICAL_HIT: {
    text: "CRITICAL!",
    color: "from-cyan to-blue-500",
    subtext: "Perfect answer",
    duration: 1500,
  },
  TIME_UP: {
    text: "TIME'S UP!",
    color: "from-orange-500 to-red-600",
    duration: 1500,
  },
  NEW_OPPONENT: {
    text: "NEW OPPONENT!",
    color: "from-cyan to-purple-500",
    subtext: "Prepare for battle",
    duration: 2000,
  },
  KNOCKOUT: {
    text: "K.O.!",
    color: "from-red-600 to-red-800",
    subtext: "Devastating victory",
    duration: 2500,
  },
  VICTORY: {
    text: "VICTORY!",
    color: "from-yellow-400 to-amber-500",
    subtext: "You are the champion",
    duration: 3000,
  },
  DEFEAT: {
    text: "DEFEATED",
    color: "from-gray-500 to-gray-700",
    subtext: "Better luck next time",
    duration: 2500,
  },
  DRAW: {
    text: "DRAW!",
    color: "from-blue-400 to-indigo-500",
    subtext: "Evenly matched",
    duration: 2000,
  },
  GAME_OVER: {
    text: "GAME OVER",
    color: "from-gray-600 to-gray-800",
    duration: 2500,
  },
  TOURNAMENT_START: {
    text: "TOURNAMENT!",
    color: "from-amber-400 to-yellow-600",
    subtext: "The battle begins",
    duration: 2500,
  },
  FINALS: {
    text: "FINALS!",
    color: "from-cyan to-amber-500",
    subtext: "The ultimate showdown",
    duration: 2500,
  },
  CHAMPION: {
    text: "CHAMPION!",
    color: "from-yellow-300 via-amber-400 to-yellow-500",
    subtext: "Undefeated",
    duration: 3500,
  },
};

export function BattleAnnouncement({
  event,
  onComplete,
  agentName,
  score,
}: BattleAnnouncementProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setIsVisible(true);
      const config = eventConfig[event];
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, config.duration);
      return () => clearTimeout(timer);
    }
  }, [event, onComplete]);

  if (!event) return null;

  const config = eventConfig[event];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Background flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 bg-gradient-to-r ${config.color}`}
          />

          {/* Main text container */}
          <div className="relative">
            {/* Starburst background */}
            <motion.div
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: [0, 1.5, 1.2], rotate: [0, 10, -5, 0] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 -m-20"
            >
              <div
                className={`w-full h-full bg-gradient-to-r ${config.color} opacity-20 blur-3xl rounded-full`}
              />
            </motion.div>

            {/* Comic book style burst shape */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.4, ease: "backOut" }}
              className="relative"
            >
              {/* Spiky background */}
              <svg
                viewBox="0 0 200 100"
                className="absolute -inset-x-32 -inset-y-16 w-[400px] h-[200px]"
              >
                <motion.polygon
                  points="100,0 120,30 150,10 140,40 180,35 150,55 190,70 150,75 170,100 130,85 100,100 70,85 30,100 50,75 10,70 50,55 20,35 60,40 50,10 80,30"
                  className={`fill-current`}
                  style={{
                    filter: "drop-shadow(0 0 20px currentColor)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                />
              </svg>

              {/* Main text */}
              <motion.h1
                initial={{ scale: 0, rotate: -10 }}
                animate={{
                  scale: [0, 1.3, 1],
                  rotate: [-10, 5, 0],
                }}
                transition={{ duration: 0.5, ease: "backOut" }}
                className={`relative text-5xl sm:text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r ${config.color} drop-shadow-2xl`}
                style={{
                  textShadow: "0 0 40px rgba(0,220,255,0.5)",
                  WebkitTextStroke: "2px rgba(255,255,255,0.3)",
                }}
              >
                {config.text}
              </motion.h1>

              {/* Score display */}
              {score !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mt-2"
                >
                  <span className="text-3xl font-bold text-white">
                    +{score}
                  </span>
                </motion.div>
              )}

              {/* Agent name */}
              {agentName && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center mt-4"
                >
                  <span className="text-2xl font-semibold text-cyan">
                    {agentName}
                  </span>
                </motion.div>
              )}

              {/* Subtext */}
              {config.subtext && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-center text-xl text-white/80 mt-4 font-medium"
                >
                  {config.subtext}
                </motion.p>
              )}
            </motion.div>

            {/* Particle effects */}
            <BattleParticles color={config.color} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BattleParticles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 0,
            x: 0,
            y: 0,
            scale: 0,
          }}
          animate={{
            opacity: [0, 1, 0],
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 400,
            scale: [0, Math.random() * 0.5 + 0.5, 0],
          }}
          transition={{
            duration: 1,
            delay: Math.random() * 0.3,
            ease: "easeOut",
          }}
          className={`absolute left-1/2 top-1/2 w-4 h-4 rounded-full bg-gradient-to-r ${color}`}
          style={{
            filter: "blur(2px)",
          }}
        />
      ))}
    </div>
  );
}

// Score popup component
export function ScorePopup({
  score,
  position,
  isCorrect,
}: {
  score: number;
  position: { x: number; y: number };
  isCorrect: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 0], y: -60, scale: [0.5, 1.2, 1] }}
      transition={{ duration: 1 }}
      className={`fixed text-2xl font-bold pointer-events-none z-50 ${
        isCorrect ? "text-green-400" : "text-red-500"
      }`}
      style={{ left: position.x, top: position.y }}
    >
      {isCorrect ? `+${score}` : `-${score}`}
    </motion.div>
  );
}

// VS Screen component
export function VSScreen({
  agent1,
  agent2,
  onComplete,
}: {
  agent1: { name: string; platform: string; rating: number };
  agent2: { name: string; platform: string; rating: number };
  onComplete?: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95"
    >
      <div className="flex items-center gap-8 sm:gap-16">
        {/* Agent 1 */}
        <motion.div
          initial={{ x: -200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "backOut" }}
          className="text-center"
        >
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl glass-card border-cyan/30 flex items-center justify-center mb-4 mx-auto">
            <span className="text-4xl sm:text-5xl font-bold text-cyan">
              {agent1.name.charAt(0)}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {agent1.name}
          </h3>
          <p className="text-sm text-muted-foreground">{agent1.platform}</p>
          <p className="text-cyan font-mono mt-1">ELO {agent1.rating}</p>
        </motion.div>

        {/* VS */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <span
            className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan to-white"
            style={{
              textShadow: "0 0 40px rgba(0,220,255,0.5)",
            }}
          >
            VS
          </span>
        </motion.div>

        {/* Agent 2 */}
        <motion.div
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "backOut" }}
          className="text-center"
        >
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl glass-card border-cyan/30 flex items-center justify-center mb-4 mx-auto">
            <span className="text-4xl sm:text-5xl font-bold text-cyan">
              {agent2.name.charAt(0)}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {agent2.name}
          </h3>
          <p className="text-sm text-muted-foreground">{agent2.platform}</p>
          <p className="text-cyan font-mono mt-1">ELO {agent2.rating}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Round indicator
export function RoundIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {[...Array(total)].map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            scale: i === current - 1 ? 1.2 : 1,
            backgroundColor:
              i < current
                ? "rgb(0, 220, 255)"
                : i === current - 1
                  ? "rgb(0, 220, 255)"
                  : "rgba(255,255,255,0.2)",
          }}
          className="w-3 h-3 rounded-full"
        />
      ))}
    </div>
  );
}

// Timer component with urgency effect
export function BattleTimer({
  seconds,
  maxSeconds,
}: {
  seconds: number;
  maxSeconds: number;
}) {
  const isUrgent = seconds <= 5;
  const percentage = (seconds / maxSeconds) * 100;

  return (
    <div className="relative">
      <motion.div
        animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
        transition={{ repeat: Infinity, duration: 0.5 }}
        className={`text-4xl font-mono font-bold ${
          isUrgent ? "text-red-500" : "text-white"
        }`}
      >
        {seconds}
      </motion.div>
      <div className="w-24 h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${percentage}%` }}
          className={`h-full rounded-full ${
            isUrgent
              ? "bg-red-500"
              : percentage > 50
                ? "bg-cyan"
                : "bg-yellow-500"
          }`}
        />
      </div>
    </div>
  );
}
