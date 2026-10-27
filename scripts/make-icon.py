"""Gera o ícone conceitual do IE Neo (assets/icon.png)."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SIZE = 1024
OUT = Path(__file__).resolve().parent.parent / "assets" / "icon.png"
ICO_OUT = OUT.with_suffix(".ico")
RENDERER_OUT = Path(__file__).resolve().parent.parent / "src" / "renderer" / "assets" / "icon.png"
OUT.parent.mkdir(parents=True, exist_ok=True)


def lerp(a, b, t):
    return int(round(a + (b - a) * t))


def main():
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    cx = cy = SIZE // 2
    radius = int(SIZE * 0.43)
    bbox = (cx - radius, cy - radius, cx + radius, cy + radius)

    # Esfera azul com gradiente vertical/diagonal.
    top = (76, 180, 255)
    bottom = (5, 61, 112)
    gradient = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(gradient)
    for y in range(bbox[1], bbox[3] + 1):
        t = (y - bbox[1]) / max(1, bbox[3] - bbox[1])
        gdraw.line(
            [(bbox[0], y), (bbox[2], y)],
            fill=(lerp(top[0], bottom[0], t), lerp(top[1], bottom[1], t), lerp(top[2], bottom[2], t), 255),
        )
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).ellipse(bbox, fill=255)
    image.alpha_composite(Image.composite(gradient, Image.new("RGBA", (SIZE, SIZE)), mask))

    # Brilho superior.
    shine = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shine)
    sdraw.ellipse(
        (cx - int(radius * 0.72), cy - int(radius * 0.83), cx + int(radius * 0.45), cy + int(radius * 0.2)),
        fill=(255, 255, 255, 34),
    )
    shine = shine.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(36))
    shine.putalpha(Image.composite(shine.getchannel("A"), Image.new("L", (SIZE, SIZE)), mask))
    image.alpha_composite(shine)

    # Anel dourado orbital.
    ring = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ring)
    ring_box = (int(SIZE * 0.055), int(SIZE * 0.31), int(SIZE * 0.945), int(SIZE * 0.69))
    rdraw.ellipse(ring_box, outline=(255, 185, 30, 255), width=26)
    rdraw.ellipse(
        (ring_box[0] + 14, ring_box[1] + 14, ring_box[2] - 14, ring_box[3] - 14),
        outline=(255, 224, 120, 160),
        width=6,
    )
    ring = ring.rotate(-16, resample=Image.BICUBIC, center=(cx, cy))
    image.alpha_composite(ring)

    # Letra "e" branca.
    font_path = Path("C:/Windows/Fonts/segoeuib.ttf")
    font = ImageFont.truetype(str(font_path), int(SIZE * 0.55)) if font_path.exists() else ImageFont.load_default()
    letter = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ldraw = ImageDraw.Draw(letter)
    text = "e"
    bbox_text = ldraw.textbbox((0, 0), text, font=font, anchor="mm")
    tx = cx - (bbox_text[0] + bbox_text[2]) // 2
    ty = cy - (bbox_text[1] + bbox_text[3]) // 2
    ldraw.text((tx, ty), text, font=font, fill=(255, 255, 255, 245), anchor="mm")
    image.alpha_composite(letter)

    # Borda suave.
    draw.ellipse(bbox, outline=(255, 255, 255, 36), width=4)

    image = image.resize((512, 512), Image.LANCZOS)
    for out in (OUT, RENDERER_OUT):
        out.parent.mkdir(parents=True, exist_ok=True)
        image.save(out, "PNG")
        print(out)

    image.save(
        ICO_OUT,
        "ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print(ICO_OUT)


if __name__ == "__main__":
    main()
