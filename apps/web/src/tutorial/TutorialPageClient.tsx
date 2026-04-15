"use client";

import dynamic from "next/dynamic";

const TutorialPage = dynamic(
  () => import("./TutorialPage").then((m) => ({ default: m.TutorialPage })),
  { ssr: false },
);

export function TutorialPageClient() {
  return <TutorialPage />;
}
