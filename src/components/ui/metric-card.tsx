import { cn } from "@/lib/utils"

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp 
}: { 
  title: string; 
  value: string; 
  icon: any; 
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="p-2 bg-blue-50 rounded-lg text-[#006CFF]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {trend && (
          <div className={cn("flex items-center mt-1 text-sm", trendUp ? "text-green-600" : "text-red-600")}>
            <span>{trend}</span>
            <span className="ml-1 text-gray-400 font-normal">vs mês anterior</span>
          </div>
        )}
      </div>
    </div>
  )
}
