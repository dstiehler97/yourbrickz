import { Github } from "@medusajs/icons"
import { Button, Heading } from "@medusajs/ui"

const Hero = () => {
  return (
    <div className="relative h-[90vh] w-full overflow-hidden bg-black text-white">
      {/* Hintergrundbild als PNG */}
      <img
        src="/images/hero-mosaic.png"
        alt="yourbrickz Mosaik aus runden Steinen"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      />

      {/* Text-Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 gap-6">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
          Dein Foto als Mosaik-Bausatz
        </h1>
        <h2 className="text-xl md:text-2xl font-light">
          Runde Steine. Klare Struktur. Individuell gefertigt.
        </h2>

        <a
          href="/de/personalize-yourbrickz"
          className="bg-white text-black px-8 py-3 rounded-full text-lg font-semibold hover:bg-gray-100 transition"
        >
          Jetzt starten
        </a>
      </div>
    </div>
  )
}

export default Hero
