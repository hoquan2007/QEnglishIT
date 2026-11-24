// Explicit icon registry for client components that pick icons by name.
// `import * as Icons from "lucide-react"` pulls every icon (~1500) into the
// client bundle; listing only the ones we use keeps the bundle small.
import {
  BarChart3, BookOpen, BookOpenText, CalendarDays, ChartColumn, FileStack, FolderHeart, GraduationCap, Headphones,
  Heart, Image, Landmark, Languages, LayoutGrid, Map, MessageCircle, MessagesSquare, Mic, PenLine, Repeat, Users,
  type LucideIcon,
} from "lucide-react";

export const ICONS = {
  BarChart3, BookOpen, BookOpenText, CalendarDays, ChartColumn, FileStack, FolderHeart, GraduationCap, Headphones,
  Heart, Image, Landmark, Languages, LayoutGrid, Map, MessageCircle, MessagesSquare, Mic, PenLine, Repeat, Users,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
