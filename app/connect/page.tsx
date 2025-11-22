"use client";

import Link from "next/link";
import { GLOBAL_COLORS } from "@/lib/colors";
import HostCard from "@/components/connect/HostCard";
import JoinCard from "@/components/connect/JoinCard";

export default function ConnectPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center font-mono px-4 transition-colors duration-300"
      style={{ backgroundColor: GLOBAL_COLORS.background, color: GLOBAL_COLORS.text.primary }}
    >
      <div className="w-full max-w-4xl mx-auto animate-fade-in">
         <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2" style={{ color: GLOBAL_COLORS.brand.primary }}>Connect</h1>
            <p style={{ color: GLOBAL_COLORS.text.secondary }}>Compete with others in real-time</p>
         </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HostCard />
          <JoinCard />
        </div>

        <div className="text-center mt-12">
             <Link href="/" className="transition text-sm hover:text-white" style={{ color: GLOBAL_COLORS.text.secondary }}>
                ← Back to Typing
            </Link>
        </div>
      </div>
    </div>
  );
}
