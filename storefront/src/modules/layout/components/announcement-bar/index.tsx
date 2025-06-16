"use client"

import { useEffect, useState } from "react"

const messages = [
  "🚚 Kostenloser Versand ab 39 € innerhalb Deutschlands!",
  "🎁 Aktionswoche: Jetzt 15 % auf alle Mosaike!",
  "🌎 Wir liefern weltweit – schnell und sicher!",
]

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length)
    }, 5000) // Wechselt alle 5 Sekunden

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full bg-black text-white text-center py-2 text-sm font-medium">
      {messages[index]}
    </div>
  )
}
