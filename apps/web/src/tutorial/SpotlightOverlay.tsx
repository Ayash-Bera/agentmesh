"use client";

interface SpotlightOverlayProps {
  highlightNodeId?: string;
  highlightEdgeId?: string;
}

export function SpotlightOverlay({ highlightNodeId, highlightEdgeId }: SpotlightOverlayProps) {
  // This component applies .tutorial-pulse class to nodes/edges via DOM manipulation
  // after the canvas renders. It uses a simple approach: just render null —
  // the pulse class is applied via className on the nodes directly in TutorialPage.
  return null;
}
