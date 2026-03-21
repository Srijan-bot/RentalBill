import React from 'react';
import StatsOverview from '../components/StatsOverview';
import BillGenerator from '../components/BillGenerator';
import RecentBills from '../components/RecentBills';

export default function Dashboard() {
    return (
        <div className="space-y-12">
            <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-display font-black tracking-tight text-slate-800 mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-slate-500 text-lg">Manage your properties and generate rent receipts with ease.</p>
                </div>
            </section>

            <StatsOverview />
            <BillGenerator />
            <RecentBills />
        </div>
    );
}
