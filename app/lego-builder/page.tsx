import type { Metadata } from "next";
import { LegoBuilder } from "@/components/LegoBuilder";

export const metadata: Metadata = {
  title: "LEGO Type Builder — Adrian",
  description: "Build and save a custom LEGO treatment for the Adrian portfolio.",
};

export default function LegoBuilderPage() {
  return <LegoBuilder />;
}
