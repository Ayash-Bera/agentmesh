"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface MockLog {
  time: string;
  level: "info" | "success";
  node: string;
  message: string;
}

const MOCK_LOGS: MockLog[] = [
  { time: "00:00:01", level: "info",    node: "tut-trigger", message: "Request received" },
  { time: "00:00:01", level: "info",    node: "tut-agent",   message: "Planning tool selection" },
  { time: "00:00:02", level: "success", node: "tut-agent",   message: "search tool called" },
  { time: "00:00:03", level: "success", node: "tut-end",     message: "Pipeline result returned" },
];

interface TutorialLogStreamProps {
  visible: boolean;
}

export function TutorialLogStream({ visible }: TutorialLogStreamProps) {
  const [revealed, setRevealed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setRevealed(0);
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setRevealed((prev) => {
        if (prev >= MOCK_LOGS.length) {
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
          }
          return prev;
        }
        return prev + 1;
      });
    }, 300);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [visible]);

  return (
    <div className="tut-log-stream">
      <AnimatePresence>
        {MOCK_LOGS.slice(0, revealed).map((log, i) => (
          <motion.div
            key={i}
            className={`console-block console-block-${log.level}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="console-line terminal-log-line">
              <span className="console-time">{log.time}</span>
              <span className={`terminal-prefix terminal-prefix-${log.level}`}>
                {log.level === "success" ? "✓" : "~"}
              </span>
              <span className="console-node">{log.node}</span>
              <strong className="console-message">{log.message}</strong>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
