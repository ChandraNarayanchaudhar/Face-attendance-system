import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAvatarUrl(name?: string) {
  if (!name) return null;
  const seed = encodeURIComponent(
    name.trim().toLowerCase().replace(/\s+/g, "-"),
  );
  return `https://api.dicebear.com/6.x/initials/svg?seed=${seed}&backgroundColor=0D8ABC,7C3AED,0F766E,0284C7&fontSize=50`;
}

export function getInitials(name?: string) {
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
