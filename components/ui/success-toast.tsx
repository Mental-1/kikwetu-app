import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SuccessToastProps {
  title: string
  description: string
  className?: string
}

export function SuccessToast({ title, description, className }: SuccessToastProps) {
  return (
    <div className={cn("flex items-start space-x-3 p-4 rounded-lg border border-green-200 bg-green-50", className)}>
      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-green-900">{title}</h4>
        <p className="text-sm text-green-700 mt-1">{description}</p>
      </div>
    </div>
  )
}
