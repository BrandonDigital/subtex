import Image from "next/image";
import {
  CheckCircle,
  XCircle,
  Scissors,
  Layers,
  Shield,
  Feather,
  Paintbrush,
  Wrench,
  Sparkles,
} from "lucide-react";

const sections = [
  {
    id: "what-is-acm",
    title: "What is ACM / ACP?",
    image: "/acm-layers.jpg",
    imageAlt:
      "Cross-section diagram of ACM (Aluminium Composite Material) sheet showing the aluminium and polyethylene core layers",
    description:
      "Aluminium Composite Material (ACM), also referred to as Aluminium Composite Panels (ACP), is an engineered sandwich panel consisting of two thin aluminium sheets permanently bonded to a solid polyethylene (PE) core. This three-layer construction delivers an exceptional balance of strength, rigidity, and lightweight performance that solid aluminium simply cannot match. The aluminium skins provide a smooth, professional finish and excellent weather protection, while the polyethylene core adds structural rigidity and dimensional stability.",
    points: [
      "Two pre-finished aluminium sheets (0.21mm each)",
      "Low-density polyethylene (PE) core for rigidity",
      "3mm total panel thickness",
      "Weighs approximately half as much as solid aluminium",
      "Maintains flatness over time — no oil canning or rippling",
      "Available in classic black and white finishes",
    ],
    variant: "neutral" as const,
  },
  {
    id: "key-benefits",
    title: "Key Benefits of ACM Panels",
    image: "/acm-benefits.jpg",
    imageAlt: "ACM panel showcasing lightweight durability and smooth finish",
    description:
      "ACM panels have become the go-to material for signage professionals, fabricators, and DIY enthusiasts alike. The unique composite structure offers advantages that make it superior to many traditional materials for a wide range of applications.",
    points: [
      "Lightweight yet exceptionally strong and rigid",
      "Outstanding weather resistance and UV stability",
      "Excellent dimensional stability — stays flat without warping",
      "Corrosion-resistant aluminium surface",
      "Easy to cut, route, bend, and shape with standard tools",
      "Smooth, clean finish ideal for printing and vinyl application",
      "Low maintenance — easy to clean and long-lasting",
      "Cost-effective alternative to solid aluminium sheets",
    ],
    variant: "positive" as const,
  },
  {
    id: "ideal-uses",
    title: "Popular Applications",
    image: "/acm-signage.jpg",
    imageAlt:
      "Professional shopfront signage made from ACM aluminium composite panels",
    description:
      "The versatility of ACM panels makes them suitable for countless indoor and outdoor projects. From professional signage to specialty vehicles, ACM delivers the performance and aesthetics that demanding applications require.",
    points: [
      "Signage — channel letters, monument signs, pole signs, pan face signs",
      "Advertising displays and point-of-purchase stands",
      "Enclosed trailers and pantech truck facades",
      "Food trucks, beverage carts, and specialty vehicles",
      "Caravan and RV exterior panels",
      "Shop fronts and retail displays",
      "Kiosks and exhibition booths",
      "Kitchen splashbacks and interior wall panels",
      "Furniture, cabinets, and joinery panels",
      "Movie and television set construction",
      "Safety partitions and enclosures",
    ],
    variant: "positive" as const,
  },
  {
    id: "performance",
    title: "Performance Characteristics",
    image: "/acm-performance.jpg",
    imageAlt: "ACM panel demonstrating durability and fabrication qualities",
    description:
      "ACM panels are engineered to perform in demanding environments. The combination of aluminium faces and PE core creates a material that excels across multiple performance metrics, making it a reliable choice for both interior and exterior applications.",
    points: [
      "Weather-resistant and UV stable for outdoor longevity",
      "Impact and abrasion resistant surface",
      "Moisture resistant — won't absorb water or swell",
      "Good dimensional stability in varying temperatures",
      "Chemical resistant to common cleaning agents",
      "Excellent electrical insulation properties",
      "Readily accepts paints, inks, digital printing, and vinyl graphics",
      "Stain resistant and easy to maintain",
    ],
    variant: "neutral" as const,
  },
  {
    id: "fabrication",
    title: "Easy to Fabricate",
    image: "/acm-fabrication.jpg",
    imageAlt: "ACM panel being cut and fabricated with standard tools",
    description:
      "One of ACM's greatest strengths is how easy it is to work with. Unlike many rigid materials that require specialised equipment, ACM can be processed using everyday workshop tools. This makes it accessible for professional fabricators and DIY projects alike.",
    points: [
      "Cuts cleanly with standard circular saws or CNC routers",
      "Can be scored and snapped for straight cuts",
      "V-grooves easily for precise folding and bending",
      "Drills without special bits — no pre-drilling required",
      "Bonds well with adhesives, tapes, and mechanical fasteners",
      "Suitable for thermoforming gentle curves",
      "CNC routing produces crisp, detailed shapes",
      "Lightweight panels are easy to handle and install",
    ],
    variant: "neutral" as const,
  },
  {
    id: "not-suitable",
    title: "Important Limitations",
    image: "/acm-warning.jpg",
    imageAlt:
      "Safety warning icon for ACM panel usage limitations and fire safety considerations",
    description:
      "While ACM is incredibly versatile, it's essential to understand its limitations. Our ACM sheets feature a polyethylene (PE) core which is NOT fire-rated. Due to Australian building regulations, PE core ACM cannot be used as external building cladding. Always select the appropriate material grade for your specific application.",
    points: [
      "Building cladding or external facades (not compliant with fire codes)",
      "Any application requiring fire resistance — PE core is NOT fireproof",
      "Load-bearing or structural applications",
      "High-temperature environments exceeding 80°C",
      "Areas with high fire risk or requiring fire-rated materials",
      "Direct prolonged contact with harsh chemicals",
      "Roofing, flooring, or walking surfaces",
    ],
    variant: "negative" as const,
  },
];

const specifications = {
  title: "Our ACM Specifications",
  description:
    "We supply premium quality 3mm ACM sheets designed for signage, displays, fabrication, and general purpose applications. Our panels combine a smooth, flat finish with excellent rigidity and weather resistance — perfect for both indoor and outdoor projects.",
  specs: [
    { label: "Total Thickness", value: "3mm" },
    { label: "Aluminium Skin Thickness", value: "0.21mm per side" },
    { label: "Core Material", value: "Low-density Polyethylene (PE)" },
    { label: "Available Colours", value: "Black & White" },
    { label: "Finish", value: "Smooth, flat surface" },
    { label: "Weather Resistance", value: "Excellent (UV stable)" },
  ],
};

const comingSoon = {
  title: "Online Custom Cut Service",
  subtitle: "Coming Soon",
  description:
    "We're developing an online custom cutting service that will allow you to order ACM sheets cut to your exact dimensions. Simply enter your measurements, and we'll precision-cut your panels ready for pickup or delivery. Perfect for projects that require specific sizes without the hassle of cutting yourself.",
  features: [
    "Enter custom dimensions online",
    "Precision CNC cutting to your specifications",
    "Reduced waste — order only what you need",
    "Ready-to-use panels delivered to your door",
  ],
};

export function AcmInfoSection() {
  return (
    <section className='py-16 bg-muted/30'>
      <div className='container mx-auto px-4'>
        {/* Main Section Header */}
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-4xl font-bold mb-4'>
            Everything You Need to Know About ACM
          </h2>
          <p className='text-muted-foreground max-w-3xl mx-auto text-lg'>
            Aluminium Composite Material (ACM) is the industry-standard panel
            for professional signage, displays, and fabrication projects.
            Discover why ACM is the preferred choice for tradespeople and DIY
            enthusiasts across Australia.
          </p>
        </div>

        {/* Info Sections */}
        <div className='space-y-20'>
          {sections.map((section, index) => (
            <div
              key={section.id}
              id={section.id}
              className={`flex flex-col gap-8 lg:gap-12 ${
                index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"
              } items-center`}
            >
              {/* Image */}
              <div className='w-full lg:w-1/2'>
                <div className='relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted'>
                  <Image
                    src={section.image}
                    alt={section.imageAlt}
                    fill
                    className='object-cover'
                    sizes='(max-width: 1024px) 100vw, 50vw'
                  />
                  {/* Fallback gradient if image doesn't exist */}
                  <div className='absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center'>
                    <div className='text-center'>
                      {section.id === "what-is-acm" && (
                        <Layers className='h-16 w-16 text-zinc-600 mx-auto mb-2' />
                      )}
                      {section.id === "key-benefits" && (
                        <Shield className='h-16 w-16 text-zinc-600 mx-auto mb-2' />
                      )}
                      {section.id === "ideal-uses" && (
                        <Paintbrush className='h-16 w-16 text-zinc-600 mx-auto mb-2' />
                      )}
                      {section.id === "performance" && (
                        <Sparkles className='h-16 w-16 text-zinc-600 mx-auto mb-2' />
                      )}
                      {section.id === "fabrication" && (
                        <Wrench className='h-16 w-16 text-zinc-600 mx-auto mb-2' />
                      )}
                      {section.id === "not-suitable" && (
                        <XCircle className='h-16 w-16 text-zinc-600 mx-auto mb-2' />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className='w-full lg:w-1/2 space-y-6'>
                <h3
                  className={`text-2xl font-bold ${
                    section.variant === "positive"
                      ? "text-green-600 dark:text-green-500"
                      : section.variant === "negative"
                      ? "text-red-600 dark:text-red-500"
                      : ""
                  }`}
                >
                  {section.title}
                </h3>
                <p className='text-muted-foreground leading-relaxed'>
                  {section.description}
                </p>
                <ul className='space-y-3'>
                  {section.points.map((point, pointIndex) => (
                    <li key={pointIndex} className='flex items-start gap-3'>
                      {section.variant === "positive" ? (
                        <CheckCircle className='h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0' />
                      ) : section.variant === "negative" ? (
                        <XCircle className='h-5 w-5 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0' />
                      ) : (
                        <span className='h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0' />
                      )}
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Specifications Card */}
        <div className='mt-20'>
          <div className='bg-card border rounded-2xl p-8 md:p-12'>
            <div className='flex items-center gap-3 mb-6'>
              <Layers className='h-8 w-8 text-primary' />
              <h3 className='text-2xl font-bold'>{specifications.title}</h3>
            </div>
            <p className='text-muted-foreground mb-8 max-w-3xl'>
              {specifications.description}
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {specifications.specs.map((spec, index) => (
                <div
                  key={index}
                  className='bg-muted/50 rounded-lg p-4 border border-border/50'
                >
                  <p className='text-sm text-muted-foreground mb-1'>
                    {spec.label}
                  </p>
                  <p className='font-semibold text-lg'>{spec.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coming Soon - Custom Cutting */}
        <div className='mt-12'>
          <div className='relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-8 md:p-12 overflow-hidden'>
            <div className='space-y-6'>
              <div className='space-y-2'>
                <h3 className='text-2xl font-bold'>{comingSoon.subtitle}</h3>
                <div className='flex items-center gap-3'>
                  <Scissors className='h-6 w-6 text-primary' />
                  <p className='text-lg text-muted-foreground font-medium'>
                    {comingSoon.title}
                  </p>
                </div>
              </div>
              <p className='text-muted-foreground leading-relaxed'>
                {comingSoon.description}
              </p>
              <ul className='space-y-3'>
                {comingSoon.features.map((feature, index) => (
                  <li key={index} className='flex items-start gap-3'>
                    <CheckCircle className='h-5 w-5 text-primary mt-0.5 flex-shrink-0' />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
