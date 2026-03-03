import { Truck, DollarSign, BadgePercent } from "lucide-react";

export function ServicesSection() {
  return (
    <section className="w-full bg-[#0A0A0A] text-white py-24 sm:py-32">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
          
          <div className="lg:col-span-7 space-y-8">
            <h2 className="text-6xl sm:text-8xl lg:text-[9rem] font-black tracking-tighter uppercase leading-[0.85]">
              Full<br />Service.
            </h2>
            <p className="text-xl sm:text-2xl font-medium opacity-70 max-w-xl leading-relaxed pt-8">
              Perth's best price for quality ACM — plus cut-to-size and delivery services to get your project done faster and cheaper.
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-end space-y-12">
            <div className="space-y-12 border-l-2 border-white/20 pl-8 sm:pl-12 py-4">
              
              <div className="space-y-4 group">
                <div className="flex items-center gap-4">
                  <DollarSign className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-3xl font-bold uppercase tracking-tight">Wholesale Pricing</h3>
                </div>
                <p className="opacity-60 font-medium text-lg">Unbeatable rates on premium panels.</p>
              </div>

              <div className="space-y-4 group">
                <div className="flex items-center gap-4">
                  <BadgePercent className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-3xl font-bold uppercase tracking-tight">Bulk Discounts</h3>
                </div>
                <p className="opacity-60 font-medium text-lg">Scale your savings with larger orders.</p>
              </div>

              <div className="space-y-4 group">
                <div className="flex items-center gap-4">
                  <Truck className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-3xl font-bold uppercase tracking-tight">Local Delivery</h3>
                </div>
                <p className="opacity-60 font-medium text-lg">Fast, reliable delivery across the Perth metro area.</p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
