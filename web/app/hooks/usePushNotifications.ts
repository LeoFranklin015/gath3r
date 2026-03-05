"use client"

import { useEffect, useRef } from "react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/backend"

export function usePushNotifications(wallet: string) {
  const registered = useRef(false)

  useEffect(() => {
    if (!wallet || registered.current) return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[push] Service workers or PushManager not supported")
      return
    }

    registered.current = true

    async function register() {
      try {
        console.log("[push] Registering service worker...")
        const reg = await navigator.serviceWorker.register("/sw.js")
        console.log("[push] Service worker registered, waiting for ready...")
        await navigator.serviceWorker.ready
        console.log("[push] Service worker ready")

        // Get VAPID public key from backend
        console.log(`[push] Fetching VAPID key from ${BACKEND_URL}/push/vapid-key`)
        const keyRes = await fetch(`${BACKEND_URL}/push/vapid-key`)
        const { publicKey } = await keyRes.json()
        if (!publicKey) {
          console.warn("[push] No VAPID public key returned from backend")
          return
        }
        console.log("[push] Got VAPID key")

        // Check existing subscription or create new one
        let subscription = await reg.pushManager.getSubscription()
        if (!subscription) {
          console.log("[push] No existing subscription, requesting permission...")
          const permission = await Notification.requestPermission()
          console.log("[push] Permission:", permission)
          if (permission !== "granted") return

          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
          })
          console.log("[push] Created new push subscription")
        } else {
          console.log("[push] Using existing push subscription")
        }

        // Register subscription with backend
        console.log(`[push] Sending subscription to backend for wallet ${wallet}`)
        const subRes = await fetch(`${BACKEND_URL}/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet, subscription: subscription.toJSON() }),
        })
        const subData = await subRes.json()
        console.log("[push] Backend response:", subData)
      } catch (err) {
        console.error("[push] Registration failed:", err)
      }
    }

    register()
  }, [wallet])
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
