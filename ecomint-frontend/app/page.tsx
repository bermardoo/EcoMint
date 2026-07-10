"use client";
import dynamic from "next/dynamic";
import { Loader2, Sprout } from "lucide-react";

const HomeComponent = dynamic(() => import("./homecomponent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Sprout className="w-16 h-16 text-[#deff9a] animate-pulse" />
        <Loader2 className="w-8 h-8 animate-spin text-[#deff9a]" />
        <p className="text-gray-400 text-xs font-semibold tracking-widest mt-2">CARREGANDO ECOMINT...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <HomeComponent />;
}