import Image from "next/image";

export function Hero() {
  return (
    <section className="relative h-[33vh] min-h-[280px] w-full overflow-hidden">
      {/* Background Image */}
      <Image
        src="/Subtex_ACM_Stack.png"
        alt="Stack of premium aluminium composite panels (ACM sheets) available for purchase in Perth, Western Australia"
        fill
        className="object-cover object-center"
        priority
        quality={90}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/50 to-transparent" />
      
      {/* Content */}
      <div className="container mx-auto px-4 relative h-full flex items-center">
        <div className="max-w-xl space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Perth Local ACM Sheets
          </h1>
          <p className="text-base sm:text-lg text-white/90 max-w-md">
            Perth&apos;s trusted supplier of quality aluminium composite panels for signage, cladding, and architectural applications. 
            Available in white and black, gloss and matte finishes. Local delivery across WA.
          </p>
        </div>
      </div>
    </section>
  );
}
