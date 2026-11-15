# Planet surface textures

The solar-system view (`simulator.html`) wraps **equirectangular (2:1) surface
maps** onto each sphere. Every file below is already committed. If a file is ever
missing, that body falls back to the built-in procedural texture automatically —
the page never breaks, it just looks stylised instead of photoreal.

## Installed files

| File | Used for |
|------|----------|
| `2k_sun.jpg`              | Sun surface |
| `2k_mercury.jpg`          | Mercury (+ bump from the same map) |
| `2k_venus_atmosphere.jpg` | Venus cloud tops |
| `2k_earth_daymap.jpg`     | Earth day surface (2048×1024) |
| `2k_earth_normal.jpg`     | Earth normal map — terrain relief |
| `2k_earth_specular.jpg`   | Earth ocean specular mask — sun glint on water |
| `2k_earth_clouds.png`     | Earth cloud shell (alpha), drifts slightly faster than the surface |
| `2k_moon.jpg`             | Moon (+ bump) |
| `2k_mars.jpg`             | Mars (+ bump) |
| `2k_jupiter.jpg`          | Jupiter bands |
| `2k_saturn.jpg`           | Saturn bands |
| `2k_saturn_ring.png`      | Saturn rings (alpha strip, inner→outer across width) |
| `2k_uranus.jpg`           | Uranus |
| `2k_neptune.jpg`          | Neptune |
| `2k_stars_milky_way.jpg`  | Milky Way sky backdrop (2048×1024), tied to the "Background stars" toggle |

## Sources & licensing

- **Planet/Sun/Milky Way maps** — Solar System Scope textures
  (https://www.solarsystemscope.com/textures), based on NASA imagery,
  **CC-BY 4.0**.
- **Earth day/normal/specular + clouds, Moon** — three.js example textures
  (https://github.com/mrdoob/three.js `examples/textures/planets`), originally
  NASA Visible Earth / Blue Marble.

Keep a CC-BY credit line in the app next to the existing NASA citations if you
ship these maps.

## Upgrading resolution

Want sharper spheres? Replace any file with an 8K version from Solar System Scope
and keep the exact same filename — the `map:` / `normalMap:` / `specularMap:` /
`clouds:` fields in the `BODIES` table in `simulator.html` are the only contract.
