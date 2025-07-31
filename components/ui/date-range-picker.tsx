"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useMediaQuery } from "@/hooks/use-media-query";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePickerWithRange({
  className,
  onDateChangeAction,
  initialRange,
  placeholder = "Pick a date",
}: React.HTMLAttributes<HTMLDivElement> & {
  onDateChangeAction: (date: DateRange | undefined) => void;
  initialRange?: DateRange;
  placeholder?: string;
}) {
  const [date, setDate] = React.useState<DateRange | undefined>(initialRange);
  const isMobile = useMediaQuery("(max-width: 768px)");

  React.useEffect(() => {
    if (date) {
      onDateChangeAction(date);
    }
  }, [date, onDateChangeAction]);

  // Keep internal state in sync if parent updates `initialRange`
  React.useEffect(() => {
    setDate(initialRange);
  }, [initialRange]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              isMobile ? "w-auto px-3" : "w-[300px]",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {!isMobile &&
              (date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>{placeholder}</span>
              ))}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(range) => {
              setDate(range);
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
