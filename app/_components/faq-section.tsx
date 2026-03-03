import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQ {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  faqs: FAQ[];
  title?: string;
  description?: string;
}

export function FaqSection({
  faqs,
  title = "FAQ.",
  description = "Common questions about ACM sheets, delivery, and ordering",
}: FaqSectionProps) {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32" id="faq">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
        
        <div className="lg:col-span-5 space-y-8">
          <h2 className="text-6xl sm:text-8xl font-black tracking-tighter uppercase leading-none">
            {title}
          </h2>
          <p className="text-xl font-medium opacity-60 leading-relaxed max-w-md">
            {description}
          </p>
        </div>
        
        <div className="lg:col-span-7">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border-b-2 border-black/10 py-2"
              >
                <AccordionTrigger className="text-left text-xl sm:text-2xl font-bold hover:no-underline hover:opacity-70 transition-opacity">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-lg font-medium opacity-60 leading-relaxed pt-4 pb-8">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

      </div>
    </section>
  );
}
