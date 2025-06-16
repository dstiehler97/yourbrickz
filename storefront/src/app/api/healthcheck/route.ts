import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest) {
  // Über Query-Parameter wird unterschieden
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');

  if (mode === 'diashow') {
    // Pfad zum Ordner "diashow"
    const diashowPath = path.join(process.cwd(), 'public/example-images/diashow');

    // Dateien im Ordner lesen
    let imageFiles: string[] = [];
    try {
      const files = fs.readdirSync(diashowPath);
      imageFiles = files.filter((file) =>
        /\.(png|jpg|jpeg|gif)$/i.test(file)
      );
    } catch (err) {
      return NextResponse.json({ error: 'Ordner nicht gefunden' }, { status: 404 });
    }

    // JSON-Antwort mit den Bilddateien
    return NextResponse.json(imageFiles);
  }

  // Default: Healthcheck
  return NextResponse.json({ status: 'ok' });
}
