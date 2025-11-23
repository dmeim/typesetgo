import TypingPractice from "@/components/TypingPractice";
import { headers } from "next/headers";

export default async function Home() {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  console.log(`[VISIT] User visited site (IP: ${ip})`);

  return <TypingPractice />;
}
