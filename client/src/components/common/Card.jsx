export const Card = ({ title, value, subtitle, icon: Icon, trend, colorClass = "border-l-sap-primary" }) => {
  return (
    <div className={`flex flex-col rounded-lg border border-slate-200 border-l-4 ${colorClass} bg-white p-4 shadow-sm transition-shadow hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-50 text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-[11px] font-medium text-slate-500">{subtitle}</p>
      )}
    </div>
  );
};
