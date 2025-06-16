import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET() {
  // Pfad zum Ordner "diashow"
  const diashowPath = path.join(process.cwd(), "public/example-images/diashow");

  // Dateien im Ordner lesen
  const files = fs.readdirSync(diashowPath);

  // Nur Bilddateien filtern
  const imageFiles = files.filter((file) =>
    /\.(png|jpg|jpeg|gif)$/i.test(file)
  );

  // JSON-Antwort mit den Bilddateien
  return NextResponse.json(imageFiles);
}