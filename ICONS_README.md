# Signal App Icons

## Konvertera SVG till PNG

För att få dina PNG-ikoner, konvertera SVG-filerna till PNG:

### Metod 1: Online Converter
1. Gå till https://convertio.co/svg-png/
2. Ladda upp SVG-filen
3. Välj rätt storlek
4. Ladda ner PNG-filen

### Metod 2: Inkscape (gratis)
```bash
inkscape favicon-16x16.svg --export-filename=favicon-16x16.png --export-width=16 --export-height=16
inkscape favicon-32x32.svg --export-filename=favicon-32x32.png --export-width=32 --export-height=32
inkscape apple-touch-icon.svg --export-filename=apple-touch-icon.png --export-width=180 --export-height=180
```

### Metod 3: ImageMagick
```bash
convert favicon-16x16.svg favicon-16x16.png
convert favicon-32x32.svg favicon-32x32.png
convert apple-touch-icon.svg apple-touch-icon.png
```

## Filer som behöver PNG-versioner:

- `favicon-16x16.svg` → `favicon-16x16.png`
- `favicon-32x32.svg` → `favicon-32x32.png`
- `apple-touch-icon.svg` → `apple-touch-icon.png`

## Placera PNG-filerna i:
```
public/
├── favicon-16x16.png
├── favicon-32x32.png
├── apple-touch-icon.png
└── favicon.ico (16x16 version)
```

## Icon Design
Ikonerna representerar "fokus" med koncentriska cirklar som symboliserar:
- Yttre cirkel: omvärlden
- Mellersta cirkel: fokusområdet
- Inre cirkel: kärnan av vad som är viktigt

Färgschema: Svart (#111827) och vit för hög kontrast och läsbarhet. 