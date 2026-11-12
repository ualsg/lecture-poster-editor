# UAL Lecture Poster Editor

Create one-, two-, or three-speaker posters for the Urban Analytics Lab.

![One-, two-, and three-speaker poster layouts](preview.jpg)

## Use

1. Open [`docs/index.html`](docs/index.html) in a browser from a local checkout and choose a template.
2. Use **Content** to edit text and portraits. Use **Layout** to adjust type sizes and spacing.
3. Download an editable **SVG** or a print-sized **PDF**. Posters start at A3 and grow vertically as needed.

## Development

The static site lives in [`docs/`](docs/). GitHub Pages publishes from `main` and `/docs`. Edit [`docs/templates.js`](docs/templates.js) to change the defaults.

```sh
python3 -m http.server 8000 --directory docs
```
