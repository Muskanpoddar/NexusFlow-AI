
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBackground: string;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBackground,
}: StatCardProps) {
  return (
    <article className="group relative h-full overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-linear-to-r from-blue-500 to-violet-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
      />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div
          className={`rounded-lg p-2.5 transition-transform duration-200 group-hover:scale-110 ${iconBackground}`}
        >
          <Icon size={21} className={iconColor} />
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-3xl font-bold tracking-tight tabular-nums text-slate-900 transition-colors duration-200 group-hover:text-blue-700">
          {value}
        </h3>

        <p className="mt-2 text-xs text-slate-400">
          {description}
        </p>
      </div>
    </article>
  );
}

export default StatCard;
