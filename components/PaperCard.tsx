"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { CaseStudy } from "@/data/caseStudies";
import type { CardTransform } from "@/lib/fanTransform";

type PaperCardProps = {
  caseStudy: CaseStudy;
  transform: CardTransform;
  zIndex: number;
};

export function PaperCard({ caseStudy, transform, zIndex }: PaperCardProps) {
  const router = useRouter();

  return (
    <motion.button
      type="button"
      onClick={() => router.push(`/work/${caseStudy.slug}`)}
      className="absolute left-1/2 top-1/2 w-64 h-40 -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-lg text-left p-4 cursor-pointer"
      style={{ backgroundColor: caseStudy.thumbnailColor, zIndex }}
      animate={{ x: transform.x, y: transform.y, rotate: transform.rotate }}
      transition={{ type: "spring", stiffness: 200, damping: 30 }}
      whileHover={{ scale: 1.05 }}
    >
      <span className="font-display text-lg block">{caseStudy.title}</span>
      <span className="text-sm block mt-2">{caseStudy.blurb}</span>
    </motion.button>
  );
}
