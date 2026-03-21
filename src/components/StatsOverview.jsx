import React from 'react';
import { CircleDollarSign, Users, Clock } from 'lucide-react';

export default function StatsOverview() {
    const stats = [
        {
            title: "Total Revenue (YTD)",
            value: "$42,500",
            change: "+12.5%",
            icon: CircleDollarSign,
            color: "text-emerald-600",
            bgIcon: "bg-emerald-50",
            badgeBg: "badge-success",
        },
        {
            title: "Active Tenants",
            value: "12",
            change: "+2 New",
            icon: Users,
            color: "text-brand-600",
            bgIcon: "bg-brand-50",
            badgeBg: "bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-bold",
        },
        {
            title: "Pending Bills",
            value: "3",
            change: "Action",
            icon: Clock,
            color: "text-amber-600",
            bgIcon: "bg-amber-50",
            badgeBg: "badge-warning",
        }
    ];

    return (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div key={index} className="glass-card p-6 flex flex-col gap-5 hover:-translate-y-1 transition-transform duration-300">
                        <div className="flex items-center justify-between">
                            <div className={`size-12 rounded-2xl flex items-center justify-center ${stat.bgIcon} shadow-sm border border-white/50`}>
                                <Icon className={`size-6 ${stat.color}`} strokeWidth={2.5} />
                            </div>
                            <span className={stat.badgeBg}>
                                {stat.change}
                            </span>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.title}</p>
                            <p className="text-3xl font-display font-black text-slate-800">{stat.value}</p>
                        </div>
                    </div>
                );
            })}
        </section>
    );
}
