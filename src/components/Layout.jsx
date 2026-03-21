import React from 'react';
import Header from './Header';

export default function Layout({ children }) {
    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-800 selection:bg-brand-200 selection:text-brand-900">
            <Header />
            <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in">
                {children}
            </main>
        </div>
    );
}
