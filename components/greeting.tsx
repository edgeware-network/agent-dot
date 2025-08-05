import { motion } from "framer-motion";

export function Greeting() {
  return (
    <div
      key="overview"
      className="mx-auto flex size-full max-w-3xl flex-col justify-center px-10 not-first:md:mt-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="font-unbounded text-foreground text-2xl font-semibold tracking-tight"
      >
        Hello there!
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="font-unbounded text-foreground text-2xl tracking-tight"
      >
        I'm <span className="text-primary font-medium">AgentDot</span>, your
        polkadot assistant.
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.7 }}
        className="font-outfit mt-2 text-xl tracking-tight text-zinc-400"
      >
        How can I help you with polkadot today?
      </motion.div>
    </div>
  );
}
