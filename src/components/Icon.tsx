// Icons come from Lucide (lucide-react, ISC licence): the set Linear, Vercel and shadcn/ui use.
// One name -> one icon, so a page asks for "heart" and never imports a library icon directly.
// Icons are decorative: always put the meaning in words next to them (or in an aria-label on the button).
import {
  AlignLeft, ArrowDownUp, ArrowUp, Bell, BookOpen, CalendarCheck, CalendarDays, ChartColumn, Check, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsUpDown, CircleAlert, ClipboardCheck, Clock, Compass, Copy, Cpu, Download, Ellipsis, ExternalLink, FileText, Globe, Heart, House,
  Inbox, Layers, LayoutGrid, Link2, List, ListChecks, LogOut, Menu, MessageCircle, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Pencil,
  Play, Plus, Rss, Search, Send, ShieldCheck, Sparkles, Sun, Target, Trash2, TrendingUp, User, UserCog, Users, Video, X, type LucideIcon,
} from "lucide-react";

const ICONS = {
  check: Check, clock: Clock, target: Target, layers: Layers, alert: CircleAlert, trend: TrendingUp, chip: Cpu, list: List,
  home: House, book: BookOpen, tasks: ListChecks, spark: Sparkles, chart: ChartColumn, compass: Compass, download: Download,
  shield: ShieldCheck, user: User, users: Users, manage: UserCog, link: Link2, file: FileText, rss: Rss, bell: Bell,
  calendar: CalendarDays, daily: CalendarCheck, status: ClipboardCheck, inbox: Inbox, heart: Heart, comment: MessageCircle, menu: Menu,
  x: X, search: Search, more: Ellipsis, copy: Copy, external: ExternalLink, edit: Pencil, trash: Trash2, play: Play, plus: Plus,
  left: ChevronLeft, right: ChevronRight, down: ChevronDown, updown: ChevronsUpDown, logout: LogOut, sun: Sun, moon: Moon,
  monitor: Monitor, globe: Globe, video: Video, text: AlignLeft, grid: LayoutGrid, sort: ArrowDownUp, up: ArrowUp, send: Send,
  panelClose: PanelLeftClose, panelOpen: PanelLeftOpen,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** The play triangle is always filled; other icons fill only when asked (the heart when it means "liked"). */
export function Icon({ name, size = 18, filled, strokeWidth = 2 }: { name: IconName; size?: number; filled?: boolean; strokeWidth?: number }) {
  const C = ICONS[name];
  return <C size={size} strokeWidth={strokeWidth} fill={filled || name === "play" ? "currentColor" : "none"} aria-hidden="true" focusable="false" />;
}
