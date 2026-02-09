import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const quickLinks = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/shipping", label: "Shipping & Deliveries" },
  { href: "/refunds", label: "Refunds" },
];

const accountLinks = [
  { href: "/sign-in", label: "Sign In" },
  { href: "/sign-up", label: "Create Account" },
  { href: "/orders", label: "My Orders" },
  { href: "/account", label: "Account Settings" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='border-t bg-muted/30'>
      <div className='container mx-auto px-4 py-12'>
        <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-4'>
          {/* Company Info */}
          <div className='space-y-4'>
            <Link href='/' className='flex items-center gap-2'>
              <Image
                src='/Subtex_Crown_Logo.svg'
                alt='Subtex'
                width={32}
                height={32}
                className='h-8 w-8'
              />
              <Image
                src='/Subtex_Text_Logo.svg'
                alt='Subtex'
                width={100}
                height={24}
                className='h-6 w-auto'
              />
            </Link>
            <p className='text-sm text-muted-foreground'>
              Perth local supplier of ACM sheets for signage, cladding, and
              architectural applications. Quality aluminium composite panels
              with local delivery across Perth.
            </p>
            <div className='text-sm text-muted-foreground'>
              <p className='font-medium'>Trading Hours</p>
              <p>Mon - Fri: 8:00 AM - 11:30 AM</p>
              <p>1:00 PM - 3:30 PM</p>
              <p className='text-xs mt-1'>Closed on Public Holidays</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className='space-y-4'>
            <h3 className='text-sm font-semibold uppercase tracking-wider'>
              Contact Us
            </h3>
            <ul className='space-y-3'>
              <li>
                <a
                  href='https://maps.google.com/?q=14B+Brewer+Rd,+Canning+Vale,+Perth,+WA,+6155'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
                >
                  <MapPin className='h-4 w-4 mt-0.5 flex-shrink-0' />
                  <span>
                    14B Brewer Rd, Canning Vale,
                    <br />
                    Perth, WA, 6155
                  </span>
                </a>
              </li>
              <li>
                <a
                  href='tel:+61000000000'
                  className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
                >
                  <Phone className='h-4 w-4 flex-shrink-0' />
                  <span>Contact via form</span>
                </a>
              </li>
              <li>
                <Link
                  href='/contact'
                  className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
                >
                  <Mail className='h-4 w-4 flex-shrink-0' />
                  <span>Send us a message</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className='space-y-4'>
            <h3 className='text-sm font-semibold uppercase tracking-wider'>
              Information
            </h3>
            <ul className='space-y-2'>
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className='text-sm text-muted-foreground hover:text-foreground transition-colors'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account Links */}
          <div className='space-y-4'>
            <h3 className='text-sm font-semibold uppercase tracking-wider'>
              Account
            </h3>
            <ul className='space-y-2'>
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className='text-sm text-muted-foreground hover:text-foreground transition-colors'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className='my-8' />

        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-xs text-muted-foreground'>
            © {currentYear} Subtex. All rights reserved. ABN: 57 157 918 011
          </p>
          <p className='text-xs text-muted-foreground'>
            All prices are in AUD and include GST
          </p>
        </div>
      </div>
    </footer>
  );
}
