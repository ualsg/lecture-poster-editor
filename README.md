# UAL Lecture Poster Editor

Create one-, two-, or three-speaker posters for the Urban Analytics Lab.

![One-, two-, and three-speaker poster layouts](preview.jpg)

## Use

1. Open [`docs/index.html`](docs/index.html) in a browser from a local checkout and choose a template.
2. Use **Content** to edit the speaker titles, names, portraits, and event date and time. Use **Layout** to adjust typography and spacing.
3. Download an editable **SVG** or a print-sized **PDF**. Filenames include the event date and speaker names. Three-speaker files use the first speaker's name followed by `et-al`.

## Development

The static site lives in [`docs/`](docs/). GitHub Pages publishes from `main` and `/docs`. Edit [`docs/templates.js`](docs/templates.js) to change the defaults.

```sh
python3 -m http.server 8000 --directory docs
```
