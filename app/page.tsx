"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { ChatWindow } from "../components/chat/ChatWindow";
import Image from "next/image";

export default function Page() {
  const [mounted, setMounted] = useState(true);
  const [booting, setBooting] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <LayoutGroup>
        <div className="w-full max-w-3xl">
          <AnimatePresence initial={false}>
            {!booting && (
              <motion.header
                key="header"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mb-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-white/80">
                  <motion.div
                    layoutId="brand-logo"
                    className="relative h-6 w-6 overflow-hidden rounded-full ring-1 ring-white/20"
                  >
                    <Image
                      src="/img/sentient_logo.jpg"
                      alt="Sentient"
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  </motion.div>
                  <h1 className="text-xl font-semibold tracking-tight text-white/90">
                    Sentient Narrative Agent
                  </h1>
                </div>
              </motion.header>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {mounted && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                ref={containerRef}
                className="glass rounded-xl p-3 md:p-4"
              >
                <ChatWindow onBootChange={setBooting} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </main>
  );
}
