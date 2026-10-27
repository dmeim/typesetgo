import { motion } from "framer-motion";
import { UsersThreeIcon } from "@phosphor-icons/react";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";

// Decorative letters only; nobody's real name or picture appears here.
const FACES = ["M", "J", "P", "L", "S"];

export function LandingHero() {
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <ul className="flex -space-x-3" aria-hidden="true">
        {FACES.map((letter, index) => (
          <motion.li key={letter} initial={{ opacity: 0, y: 20, scale: 0.5 }} animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
            transition={{ opacity: { delay: index * 0.07 }, scale: { ...CONNECT_SPRING, delay: index * 0.07 }, y: { duration: 2.6, repeat: Infinity, delay: index * 0.3, ease: "easeInOut" } }}>
            <ConnectAvatar name={letter} className="size-14 text-xl ring-4 ring-background" />
          </motion.li>
        ))}
      </ul>
      <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
        <UsersThreeIcon weight="fill" className="size-4" aria-hidden="true" />Connect
      </span>
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Type together, live.</h1>
      <p className="max-w-xl text-muted-foreground">Got a code? Pop it in and type along with your class. Teaching? Flip the switch to host.</p>
    </header>
  );
}
