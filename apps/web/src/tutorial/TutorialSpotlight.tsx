"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useReactFlow } from "@xyflow/react";
import { TUTORIAL_EDGES, TUTORIAL_NODES } from "./tutorialSteps";

interface TutorialSpotlightProps {
  highlightNodeId?: string;
  highlightEdgeId?: string;
  active: boolean;
}

const NODE_SIZES: Record<string, [number, number]> = {
  agent:   [246, 220],
  trigger: [246, 140],
  end:     [246, 140],
};

const SPRING_CONFIG = { stiffness: 350, damping: 32 };

export function TutorialSpotlight({ highlightNodeId, highlightEdgeId, active }: TutorialSpotlightProps) {
  const { flowToScreenPosition } = useReactFlow();

  const mX = useMotionValue(0);
  const mY = useMotionValue(0);
  const mW = useMotionValue(246);
  const mH = useMotionValue(140);

  const springX = useSpring(mX, SPRING_CONFIG);
  const springY = useSpring(mY, SPRING_CONFIG);
  const springW = useSpring(mW, SPRING_CONFIG);
  const springH = useSpring(mH, SPRING_CONFIG);

  useEffect(() => {
    const wrap = document.querySelector(".tutorial-canvas-wrap") as HTMLElement | null;

    function recalculate() {
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();

      if (highlightNodeId) {
        const node = TUTORIAL_NODES.find((n) => n.id === highlightNodeId);
        if (!node) return;
        const screen = flowToScreenPosition(node.position);
        const [w, h] = NODE_SIZES[node.type] ?? [246, 140];
        mX.set(screen.x - rect.left);
        mY.set(screen.y - rect.top);
        mW.set(w);
        mH.set(h);
      } else if (highlightEdgeId) {
        const edge = TUTORIAL_EDGES.find((e) => e.id === highlightEdgeId);
        if (!edge) return;
        const srcNode = TUTORIAL_NODES.find((n) => n.id === edge.source);
        const tgtNode = TUTORIAL_NODES.find((n) => n.id === edge.target);
        if (!srcNode || !tgtNode) return;
        const midFlow = {
          x: (srcNode.position.x + tgtNode.position.x) / 2 + 123,
          y: (srcNode.position.y + tgtNode.position.y) / 2 + 70,
        };
        const screen = flowToScreenPosition(midFlow);
        mX.set(screen.x - rect.left - 60);
        mY.set(screen.y - rect.top - 16);
        mW.set(120);
        mH.set(32);
      }
    }

    recalculate();

    const observer = wrap ? new ResizeObserver(recalculate) : null;
    if (wrap && observer) observer.observe(wrap);
    return () => observer?.disconnect();
  }, [highlightNodeId, highlightEdgeId, flowToScreenPosition, mX, mY, mW, mH]);

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "absolute",
        borderRadius: 18,
        boxShadow: "0 0 0 9999px rgba(3, 7, 5, 0.68)",
        border: "2px solid rgba(45, 219, 118, 0.65)",
        filter: "drop-shadow(0 0 14px rgba(45, 219, 118, 0.45))",
        pointerEvents: "none",
        zIndex: 10,
        x: springX,
        y: springY,
        width: springW,
        height: springH,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.25 }}
    />
  );
}
