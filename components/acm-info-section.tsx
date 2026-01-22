import Image from "next/image";
import { CheckCircle, XCircle } from "lucide-react";

const sections = [
  {
    id: "what-is-acm",
    title: "What are ACM Sheets?",
    image: "/acm-layers.jpg", // Replace with your image
    imageAlt: "Cross-section diagram of ACM (Aluminium Composite Material) sheet showing the aluminium and polyethylene core layers",
    description:
      "ACM (Aluminium Composite Material), also known as ACP (Aluminium Composite Panels), consists of two thin aluminium sheets bonded to a polyethylene (PE) core. This creates a lightweight yet rigid panel that is easy to fabricate, highly durable, and provides an excellent flat surface finish. ACM sheets are the industry standard for professional signage in Perth and across Australia.",
    points: [
      "Two aluminium sheets (typically 0.3-0.5mm each)",
      "Polyethylene or mineral core (2-5mm thick)",
      "Total thickness usually 3-6mm",
      "Lightweight compared to solid aluminium",
      "Weather-resistant and UV stable",
    ],
    variant: "neutral" as const,
  },
  {
    id: "ideal-uses",
    title: "What Are ACM Panels Used For?",
    image: "/acm-signage.jpg", // Replace with your image
    imageAlt: "Professional shopfront signage made from ACM aluminium composite panels in Perth",
    description:
      "ACM sheets are versatile and widely used across Perth's signage and construction industries for both interior and exterior applications where a flat, professional finish is required. They are the preferred choice for sign makers, architects, and builders.",
    points: [
      "Signage and advertising displays",
      "Shop fronts and retail fitouts",
      "Interior wall cladding and partitions",
      "Exhibition stands and displays",
      "Furniture and joinery panels",
      "Machine and equipment panels",
      "Decorative wall panels",
      "Vehicle body panels (non-structural)",
    ],
    variant: "positive" as const,
  },
  {
    id: "not-suitable",
    title: "When Not to Use ACM Sheets",
    image: "/acm-warning.jpg", // Replace with your image
    imageAlt: "Safety warning icon for ACM panel usage limitations and fire safety considerations",
    description:
      "While ACM is versatile, it has limitations. Understanding these ensures you select the right material for your project and maintain safety compliance with Australian building codes.",
    points: [
      "Load-bearing or structural applications",
      "High-temperature environments (>80°C)",
      "External cladding on buildings over 2 storeys (check local fire codes)",
      "Fire-prone areas without FR-rated core",
      "Direct contact with certain chemicals",
      "Applications requiring high impact resistance",
      "Roofing or flooring applications",
    ],
    variant: "negative" as const,
  },
];

export function AcmInfoSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="space-y-20">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`flex flex-col gap-8 lg:gap-12 ${
                index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"
              } items-center`}
            >
              {/* Image */}
              <div className="w-full lg:w-1/2">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
                  <Image
                    src={section.image}
                    alt={section.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  {/* Fallback gradient if image doesn't exist */}
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                    <span className="text-zinc-500 text-sm">Image placeholder</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="w-full lg:w-1/2 space-y-6">
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
                <p className="text-muted-foreground leading-relaxed">
                  {section.description}
                </p>
                <ul className="space-y-3">
                  {section.points.map((point, pointIndex) => (
                    <li
                      key={pointIndex}
                      className="flex items-start gap-3"
                    >
                      {section.variant === "positive" ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                      ) : section.variant === "negative" ? (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      )}
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
