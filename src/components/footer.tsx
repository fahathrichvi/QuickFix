import Link from 'next/link';
import { Wrench, ShieldCheck, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Wrench className="h-4 w-4" />
            </div>
            <span>Quickfix</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            The next-generation local business marketplace powered by Supabase. Connect with verified local pros, schedule appointments instantly, and get top-quality repairs done fast.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Services</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/search?category=plumbing-drainage" className="hover:text-white transition">Plumbing & Leaks</Link></li>
            <li><Link href="/search?category=electrical-wiring" className="hover:text-white transition">Electrical & Wiring</Link></li>
            <li><Link href="/search?category=hvac-air-conditioning" className="hover:text-white transition">HVAC & Cooling</Link></li>
            <li><Link href="/search?category=cleaning-housekeeping" className="hover:text-white transition">Home Cleaning</Link></li>
            <li><Link href="/search?category=carpentry-handyman" className="hover:text-white transition">Carpentry & Assembly</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">For Pros & Businesses</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/auth/register?role=business_owner" className="hover:text-white transition">List Your Business</Link></li>
            <li><Link href="/dashboard/business" className="hover:text-white transition">Owner Portal</Link></li>
            <li><Link href="#" className="hover:text-white transition">Verification Program</Link></li>
            <li><Link href="#" className="hover:text-white transition">Pricing & Subscriptions</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Platform & Developer</h4>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Row Level Security Enforced</span>
            </li>
            <li className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span>PostGIS Location Search</span>
            </li>
            <li className="pt-2 text-slate-300 font-semibold">
              Developer: <span className="text-blue-400 font-bold">Fahath Richvi</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-900 mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>
          © {new Date().getFullYear()} Quickfix Local Marketplace. All rights reserved.
        </div>
        <div>
          Designed & Developed with <span className="text-rose-500">♥</span> by <strong className="text-slate-300">Fahath Richvi</strong>
        </div>
      </div>
    </footer>
  );
}
