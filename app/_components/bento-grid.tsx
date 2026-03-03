import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Asterisk } from "lucide-react";

export function BentoGrid() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
      {/* Mobile Background Texture */}
      <div className="fixed inset-0 -z-10 block lg:hidden opacity-20 pointer-events-none">
        <Image
          src="/Slates.webp"
          alt="Slate Texture"
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(180px,auto)]">
        
        {/* 1. Hero Tile (Large) */}
        <Link 
          href="/products"
          className="group relative md:col-span-8 md:row-span-3 overflow-hidden bg-[#0A0A0A] text-white p-8 sm:p-12 flex flex-col justify-between min-h-[500px] transition-all duration-500 hover:bg-white hover:text-black border border-transparent hover:border-black/10"
        >
          <div className="relative z-10 flex justify-between items-start">
            <Asterisk className="w-24 h-24 sm:w-32 sm:h-32 animate-spin-slow" strokeWidth={1.5} />
          </div>
          <div className="relative z-10 mt-auto">
            <h1 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-black tracking-tighter leading-[0.9] uppercase mb-6">
              Perfect<br />Sheet<br />For DIY.
            </h1>
            <p className="text-lg sm:text-xl font-medium tracking-wide max-w-md opacity-80">
              Choose your colour, cut your size, and collect.
            </p>
          </div>
        </Link>

        {/* 2. Thickness Tile: 3MM */}
        <div className="group relative md:col-span-4 md:row-span-2 overflow-hidden bg-white text-black flex items-center justify-center border border-black/10 p-8 sm:p-10 transition-all duration-500 hover:bg-black hover:text-white cursor-default">
          <span className="text-[5rem] sm:text-[6rem] font-black tracking-tighter leading-none opacity-10 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110">
            3MM
          </span>
        </div>

        {/* 3. Product Tile: Durability */}
        <div className="group relative md:col-span-4 md:row-span-2 overflow-hidden bg-[#1A1A1A] text-white p-8 sm:p-10 flex flex-col justify-between transition-all duration-500">
          <div className="absolute inset-0 z-0 opacity-30 transition-transform duration-700 group-hover:scale-105">
            <Image
              src="/Slates.webp"
              alt="Slate Texture"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover grayscale"
            />
          </div>
          <div className="relative z-10 mt-auto">
            <h3 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-none">
              ACM<br />Made<br />Simple.
            </h3>
          </div>
        </div>

        {/* 4. Service Tile: Straight Cut */}
        <Link
          href="/services"
          className="group relative md:col-span-8 md:row-span-1 overflow-hidden bg-white text-black p-8 sm:p-10 flex items-center justify-between border border-black/10 transition-all duration-500 hover:bg-black hover:text-white"
        >
          <div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-none">
              Straight Cut.
            </h3>
            <p className="text-sm sm:text-base font-medium opacity-70 mt-2">
              Millimeter-perfect cuts to your exact dimensions. Zero hassle.
            </p>
          </div>
          <ArrowUpRight className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 opacity-30 group-hover:opacity-100 transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={1} />
        </Link>

      </div>
    </section>
  );
}
