import React from 'react';
import { NavLink } from 'react-router-dom';
import { Receipt, Bell, Search } from 'lucide-react';

export default function Header() {
    const linkClass = ({ isActive }) =>
        isActive
            ? "text-brand-600 font-bold text-sm px-4 py-2 bg-brand-50 rounded-xl transition-all duration-300"
            : "text-slate-500 font-medium text-sm px-4 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-50 transition-all duration-300";

    return (
        <header className="sticky top-0 z-50 px-4 py-4 md:px-6 md:py-6 no-print w-full flex justify-center">
            <div className="glass-panel px-4 py-3 flex items-center justify-between w-full max-w-[1400px]">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
                        <Receipt className="size-6" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-slate-800 text-xl font-display font-bold tracking-tight hidden sm:block">RentReceipt</h2>
                </div>

                {/* Nav */}
                <nav className="hidden md:flex items-center gap-1 bg-transparent">
                    <NavLink to="/" className={linkClass}>Dashboard</NavLink>
                    <NavLink to="/tenants" className={linkClass}>Tenants</NavLink>
                    <NavLink to="/settings" className={linkClass}>Settings</NavLink>
                    <NavLink to="/reports" className={linkClass}>Reports</NavLink>
                </nav>

                {/* Profile / Actions */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="hidden sm:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                        <Search className="size-4 text-slate-400 mr-2" />
                        <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-sm w-32 placeholder:text-slate-400" />
                    </div>
                    <button className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors relative">
                        <Bell className="size-5" />
                        <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border-2 border-white"></span>
                    </button>

                    <div className="flex items-center gap-3 cursor-pointer pl-2 sm:pl-4 border-l border-slate-200">
                        <div className="size-9 rounded-full bg-cover bg-center ring-2 ring-white shadow-sm" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBdiQSRb5IyspRf8wtS9McyNTO38AWvZX8Lv3GOZc84W--AhXSrIkjfC60aq9ISeL3b2fbzUGSEqmiYoCPGp1RbiwT07KTTFJwXusR-k2l6XY0kp-TGdF2EHRQzGkbaE9Lgw_SmzhoEJuARZAkNH3f6crvdgJEkyjWks3LFP0g8W78ekABYNGpz74ZjaWtLMtNRcbx2t66kZ0c7PymRFqPcXfpqt9qgAY_5DCTs2auXRKGqP9wJuh42ioPinGQm3A6z24OcsZZ5Bw4")' }}></div>
                    </div>
                </div>
            </div>
        </header>
    );
}
