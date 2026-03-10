"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import {
  getNotifications,
  Notification as NotificationType,
  markAllNotificationsRead,
} from "@/lib/api/notifications";
import { useToast } from "@/context/ToastContext";
import Pusher from "pusher-js";

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "";
const GLOBAL_CHANNEL = "notifications-global";
const EVENT_NAME = "notification.created";

function formatTimeAgo(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function getStoredUserId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("gymhub_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem("gymhub_token");
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { info } = useToast();
  const pusherRef = useRef<Pusher | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      setLoading(true);
      const res = await getNotifications({ page: 1, limit: 20 });
      setNotifications(res.data);
      setUnreadCount(Number(res.unreadCount) || 0);
    } catch {
      // silently ignore – user may not be logged in
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!PUSHER_KEY || !PUSHER_CLUSTER) return;
    if (!isAuthenticated()) return;

    const client = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
    pusherRef.current = client;

    const onEvent = (payload: { title?: string; message?: string }) => {
      const title = payload?.title || "Notification";
      const message = payload?.message || "";
      const text = message ? `${title}: ${message}` : title;
      info(text);
      fetchNotifications();
    };

    const globalCh = client.subscribe(GLOBAL_CHANNEL);
    globalCh.bind(EVENT_NAME, onEvent);

    const userId = getStoredUserId();
    let userChName: string | null = null;
    if (userId) {
      userChName = `notifications-user-${userId}`;
      const userCh = client.subscribe(userChName);
      userCh.bind(EVENT_NAME, onEvent);
    }

    return () => {
      globalCh.unbind(EVENT_NAME, onEvent);
      client.unsubscribe(GLOBAL_CHANNEL);
      if (userChName) {
        client.unsubscribe(userChName);
      }
      client.disconnect();
      pusherRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && unreadCount > 0) {
      try {
        await markAllNotificationsRead();
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true })),
        );
      } catch {
        // ignore
      }
    }
  };

  const hasNotifications = notifications.length > 0;
  const badgeVisible = useMemo(() => unreadCount > 0, [unreadCount]);

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-orange-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-orange-500/80 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            !badgeVisible ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notification
          </h5>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-white bg-orange-500 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {loading && (
            <li className="px-4.5 py-3 text-sm text-gray-500 dark:text-gray-400">
              Loading notifications...
            </li>
          )}
          {!loading && !hasNotifications && (
            <li className="px-4.5 py-3 text-sm text-gray-500 dark:text-gray-400">
              No notifications yet.
            </li>
          )}
          {!loading &&
            notifications.map((n) => (
              <li key={n.id}>
                <DropdownItem
                  onItemClick={closeDropdown}
                  className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <span className="relative block w-full h-10 rounded-full z-1 max-w-10">
                    <Image
                      width={40}
                      height={40}
                      src="/images/logo/logo-icon.svg"
                      alt="Notification"
                      className="w-full overflow-hidden rounded-full bg-orange-500 p-1.5"
                    />
                  </span>

                  <span className="block">
                    <span className="mb-1.5 block text-theme-sm text-gray-700 dark:text-gray-200">
                      <span className="font-semibold">
                        {n.title || "Notification"}
                      </span>
                    </span>

                    {n.message && (
                      <span className="block mb-1 text-sm text-gray-500 dark:text-gray-400">
                        {n.message}
                      </span>
                    )}

                    <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
                      <span className="capitalize">{n.type}</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span>{formatTimeAgo(n.created_at)}</span>
                      {!n.is_read && (
                        <>
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <span className="text-orange-500">New</span>
                        </>
                      )}
                    </span>
                  </span>
                </DropdownItem>
              </li>
            ))}
        </ul>
      </Dropdown>
    </div>
  );
}
