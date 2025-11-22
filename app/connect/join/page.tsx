"use client";

import Link from "next/link";
import { GLOBAL_COLORS } from "@/lib/colors";
import JoinCard from "@/components/connect/JoinCard";

export default function ConnectJoinPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center font-mono px-4 transition-colors duration-300"
      style={{ backgroundColor: GLOBAL_COLORS.background, color: GLOBAL_COLORS.text.primary }}
    >
      <div className="w-full max-w-md animate-fade-in">
         <div className="text-center mb-8">
             <Link href="/connect" className="text-sm hover:text-white mb-4 inline-block" style={{ color: GLOBAL_COLORS.text.secondary }}>
                ← Back
            </Link>
         </div>
        <JoinCard />
      </div>
    </div>
  );
}
