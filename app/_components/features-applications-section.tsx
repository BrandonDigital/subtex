const keyFeatures = [
  "Lightweight",
  "Smooth Surface",
  "Easy-Peel Film",
  "Easy Fabrication",
  "Cost Effective",
];

const applications = [
  "Indoor/Outdoor Signage",
  "UV and Screen Printing",
  "Display (POS/POP)",
  "3D Lettering",
  "Shop Fitting",
  "Exhibition Display",
];

export function FeaturesApplicationsSection() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        {/* Key Features */}
        <div className="space-y-12">
          <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none">
            Built<br />To<br />Perform.
          </h2>
          <div className="h-px w-full bg-black/10" />
          <ul className="space-y-6">
            {keyFeatures.map((feature, i) => (
              <li key={feature} className="flex items-center gap-6 group">
                <span className="text-4xl sm:text-5xl font-black tracking-tighter opacity-15 w-16">0{i + 1}</span>
                <span className="text-2xl sm:text-3xl font-bold tracking-tight group-hover:translate-x-2 transition-transform duration-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Applications */}
        <div className="space-y-12 lg:mt-32">
          <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none text-right">
            Endless<br />Uses.
          </h2>
          <div className="h-px w-full bg-black/10" />
          <ul className="space-y-6">
            {applications.map((application, i) => (
              <li key={application} className="flex items-center justify-end gap-6 group">
                <span className="text-xl sm:text-2xl font-bold tracking-tight">{application}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
