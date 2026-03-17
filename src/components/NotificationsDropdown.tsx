import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  campaign_id: string | null;
  created_at: string;
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  }

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function clearAll() {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").delete().in("id", ids);
    setNotifications([]);
  }

  function handleClick(notif: Notification) {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.campaign_id) {
      navigate(`/campaigns/${notif.campaign_id}`);
      setOpen(false);
    }
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearAll}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={`flex items-start gap-3 px-3 py-3 cursor-pointer ${
                  !notif.is_read ? "bg-primary/5" : ""
                }`}
                onClick={() => handleClick(notif)}
              >
                {typeIcon(notif.type)}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${!notif.is_read ? "font-medium" : ""}`}>
                    {notif.title}
                  </p>
                  {notif.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.message}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notif.is_read && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
