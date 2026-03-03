import Image from "next/image";

const sections = [
  {
    id: "what-is-acm",
    title: "What is ACM / ACP?",
    image: "/Subtex_ACM_Stack.png",
    imageAlt: "Stack of Subtex ACM panels",
    description: "Aluminium Composite Material (ACM), also referred to as Aluminium Composite Panels (ACP), is an engineered sandwich panel consisting of two thin aluminium sheets permanently bonded to a solid polyethylene (PE) core. This three-layer construction delivers an exceptional balance of strength, rigidity, and lightweight performance that solid aluminium simply cannot match.",
    points: [
      "Two pre-finished aluminium sheets (0.21mm each)",
      "Low-density polyethylene (PE) core for rigidity",
      "3mm total panel thickness",
      "Weighs approximately half as much as solid aluminium",
      "Maintains flatness over time — no oil canning or rippling",
    ],
  },
  {
    id: "key-benefits",
    title: "Key Benefits",
    image: "/Subtex_ACM_White_Stack.png",
    imageAlt: "Subtex white ACM panel stack",
    description: "ACM panels have become the go-to material for signage professionals, fabricators, and DIY enthusiasts alike. The unique composite structure offers advantages that make it superior to many traditional materials for a wide range of applications.",
    points: [
      "Lightweight yet exceptionally strong and rigid",
      "Outstanding weather resistance and UV stability",
      "Excellent dimensional stability — stays flat without warping",
      "Corrosion-resistant aluminium surface",
      "Easy to cut, route, bend, and shape with standard tools",
    ],
  },
  {
    id: "fabrication",
    title: "Easy to Fabricate",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1000&auto=format&fit=crop",
    imageAlt: "ACM panel being cut and fabricated",
    description: "One of ACM's greatest strengths is how easy it is to work with. Unlike many rigid materials that require specialised equipment, ACM can be processed using everyday workshop tools. This makes it accessible for professional fabricators and DIY projects alike.",
    points: [
      "Cuts cleanly with standard circular saws or CNC routers",
      "Can be scored and snapped for straight cuts",
      "V-grooves easily for precise folding and bending",
      "Drills without special bits — no pre-drilling required",
      "Bonds well with adhesives, tapes, and mechanical fasteners",
    ],
  },
];

export function AcmInfoSection() {
  return (
    <section className="w-full py-24 sm:py-32">
      <div className="mb-24 sm:mb-32 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-6xl sm:text-8xl lg:text-[8rem] font-black tracking-tighter uppercase leading-[0.85] mb-8 max-w-5xl">
          The Anatomy<br />Of ACM.
        </h2>
        <p className="text-xl sm:text-2xl font-medium opacity-60 max-w-2xl">
          Everything you need to know about Aluminium Composite Material.
        </p>
      </div>

      <div>
        {sections.map((section, index) => {
          const isReversed = index % 2 === 1;
          return (
            <div key={section.id} id={section.id} className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
              <div className={`relative min-h-[300px] lg:min-h-0 bg-black/5 overflow-hidden group ${isReversed ? 'lg:order-2' : ''}`}>
                <Image
                  src={section.image}
                  alt={section.imageAlt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                />
              </div>

              <div className={`space-y-8 px-4 sm:px-6 lg:px-16 py-16 sm:py-24 ${isReversed ? 'lg:order-1' : ''}`}>
                <span className="text-6xl sm:text-8xl font-black tracking-tighter opacity-15">
                  0{index + 1}
                </span>
                <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase leading-none">
                  {section.title}
                </h3>
                <p className="text-lg font-medium opacity-70 leading-relaxed">
                  {section.description}
                </p>
                <ul className="space-y-4 pt-4">
                  {section.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 bg-black mt-2.5 shrink-0" />
                      <span className="font-medium opacity-80">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
