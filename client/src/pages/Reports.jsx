import { BarChart2, TrendingUp, Download, Calendar, Filter } from 'lucide-react';

const Reports = () => {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Collection Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Analyze collection trends and fat content statistics.</p>
        </div>
        <div className="flex gap-2">
           <button className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
             <Calendar className="h-4 w-4" /> This Month
           </button>
           <button className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
             <Download className="h-4 w-4" /> Export Results
           </button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Top Villages</h3>
              <TrendingUp className="h-4 w-4 text-green-500" />
           </div>
           <div className="space-y-4">
              {[
                { name: 'Green Valley', value: '45,200 KG', pct: 45 },
                { name: 'Blue Hills', value: '32,100 KG', pct: 32 },
                { name: 'Central Plain', value: '23,400 KG', pct: 23 },
              ].map(v => (
                <div key={v.name}>
                   <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-700">{v.name}</span>
                      <span className="font-bold text-slate-900">{v.value}</span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${v.pct}%` }} />
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col items-center justify-center p-12 text-slate-300">
           <BarChart2 className="h-16 w-16 mb-4 opacity-50" />
           <p className="text-lg font-medium text-slate-400">Interactive charts will load here...</p>
           <p className="text-sm text-slate-400 mt-1 truncate">Monthly collection analytics powered by Chart.js / Recharts</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
