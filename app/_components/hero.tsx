import Image from "next/image";

export function Hero() {
  return (
    <section className='relative h-[33vh] min-h-[280px] w-full overflow-hidden'>
      {/* Background Image */}
      <Image
        src='/Subtex_ACM_Stack.png'
        alt='Stack of premium aluminium composite panels (ACM sheets) available for purchase in Perth, Western Australia'
        fill
        className='object-cover object-center'
        priority
        quality={90}
        sizes='100vw'
      />

      {/* Gradient Overlay */}
      <div className='absolute inset-0 bg-linear-to-r from-black/70 via-black/50 to-transparent' />

      {/* Content */}
      <div className='w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative h-full flex items-center'>
        <div className='max-w-xl space-y-4'>
          <h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight'>
            Perth&apos;s Best Price Quality ACM Sheets
          </h1>
          <p className='text-base sm:text-lg text-white/90 max-w-md'>
            Wholesale prices on premium aluminium composite panels for signage,
            trailers, caravans, and splashbacks. Cut-to-size and local delivery
            available across Perth &amp; WA.
          </p>
        </div>
      </div>
    </section>
  );
}
