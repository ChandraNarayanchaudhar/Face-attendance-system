"use client";

import { eachDayOfInterval, format, getDay, isSameDay } from "date-fns";
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import NepaliDate, { dateConfigMap } from "nepali-date-converter";

export interface HolidayCalendarItem {
  id: string;
  date: string;
  name: string;
  tag: string;
}

interface HolidayCalendarProps {
  holidays: HolidayCalendarItem[];
  initialMonth?: Date;
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const bsMonthNames = [
  "Baisakh",
  "Jestha",
  "Asar",
  "Shrawan",
  "Bhadra",
  "Aswin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

function formatBsMonthYear(year: number, month: number) {
  return new NepaliDate(year, month, 1).format("MMMM YYYY", "en");
}

function formatNepaliDay(date: Date) {
  return new NepaliDate(date).format("D", "en");
}

function getBsMonthLength(year: number, month: number) {
  const monthName = bsMonthNames[month] as keyof (typeof dateConfigMap)[string];
  return dateConfigMap[year?.toString()]?.[monthName] ?? 30;
}

function formatHolidayNepaliDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new NepaliDate(date).format("DD MMMM YYYY", "en");
}

export function HolidayCalendar({
  holidays,
  initialMonth = new Date(),
}: HolidayCalendarProps) {
  const initialBs = new NepaliDate(initialMonth);
  const [bsYear, setBsYear] = React.useState(initialBs.getYear());
  const [bsMonth, setBsMonth] = React.useState(initialBs.getMonth());
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const today = now;
  const holidayMap = new Map(
    holidays.map((holiday) => [holiday.date, holiday]),
  );
  const monthLength = getBsMonthLength(bsYear, bsMonth);
  const adMonthStart = new NepaliDate(bsYear, bsMonth, 1).toJsDate();
  const adMonthEnd = new NepaliDate(bsYear, bsMonth, monthLength).toJsDate();
  const days = eachDayOfInterval({ start: adMonthStart, end: adMonthEnd });
  const blanks = Array.from({ length: getDay(adMonthStart) });
  const currentMonthHolidays = holidays.filter((holiday) => {
    const bsDate = new NepaliDate(new Date(holiday.date));
    return bsDate.getYear() === bsYear && bsDate.getMonth() === bsMonth;
  });

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 rounded-3xl border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Holiday calendar
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {formatBsMonthYear(bsYear, bsMonth)}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {format(now, "EEEE, MMM d, yyyy h:mm:ss a")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
            onClick={() => {
              const current = new NepaliDate(bsYear, bsMonth, 1);
              current.setMonth(current.getMonth() - 1);
              setBsYear(current.getYear());
              setBsMonth(current.getMonth());
            }}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
            onClick={() => {
              const current = new NepaliDate(bsYear, bsMonth, 1);
              current.setMonth(current.getMonth() + 1);
              setBsYear(current.getYear());
              setBsMonth(current.getMonth());
            }}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-3xl border border-border bg-background p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {blanks.map((_, index) => (
              <div
                key={`blank-${index}`}
                className="h-16 rounded-2xl bg-muted/10"
              />
            ))}

            {days.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const holiday = holidayMap.get(iso);
              const isSaturday = getDay(day) === 6;
              const isSunday = getDay(day) === 0;
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={iso}
                  className={`min-h-[5rem] rounded-3xl border p-2 text-left text-xs transition-all ${
                    holiday
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border bg-background"
                  } ${isToday ? "ring-2 ring-primary" : ""} ${
                    !holiday && isSaturday
                      ? "text-red-600"
                      : !holiday && isSunday
                        ? "text-muted-foreground"
                        : "text-foreground"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {formatNepaliDay(day)}
                    </span>
                    {holiday && (
                      <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        {holiday.tag === "National" ? "Public" : "Institution"}
                      </span>
                    )}
                  </div>
                  {holiday ? (
                    <div className="text-[10px] leading-snug text-destructive">
                      {holiday.name}
                    </div>
                  ) : isSaturday ? (
                    <div className="text-[10px] font-semibold text-red-600">
                      Saturday
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-background p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-foreground">
                Holidays this month
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-foreground">
                {currentMonthHolidays.length}
              </span>
            </div>
            <div className="space-y-2">
              {currentMonthHolidays.length > 0 ? (
                currentMonthHolidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="rounded-2xl border border-border bg-card p-3"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                      <span>{holiday.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatHolidayNepaliDate(holiday.date)}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {holiday.tag === "National"
                        ? "Public holiday"
                        : "Institution holiday"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                  No holiday scheduled for this month.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
