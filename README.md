# Urban Analytics Lab lecture poster templates

A browser editor and three editable A3 SVGs based on the original Photoshop posters.

![One-, two-, and three-speaker poster layouts](preview.jpg)

## Edit and export in a browser

Open [docs/index.html](docs/index.html) in a browser from a local checkout, or use the deployed site. Choose **1 speaker**, **2 speakers**, or **3 speakers**.

- **Content** edits lecture titles, speaker biographies or talk abstracts, photos, and event details. Open a speaker's **Portrait adjustments** to zoom and reposition the image in its circle, or change its saturation. At 100% zoom the image fits the circle. At 0% saturation it appears in grayscale.
- **Layout** has sliders for main titles, subtitles or talk titles, speaker names, and other text. The other-text slider scales affiliations, biographies, abstracts, and event details together. Spacing sliders move sections, and the black panels and lower sections resize as text wraps.
- **Download SVG** saves a standalone file with editable text and embedded artwork, including the portrait crop and saturation. The layout starts at A3 and grows vertically if the content runs past the available space. The preview shows the current dimensions. Reduce text, type size, or spacing to return to A3.
- **Download PDF** saves the current preview as a single print-sized page. If the browser opens its print dialog, choose **Save as PDF**.

Drafts are stored in the current browser when local storage is available. **Restore template** restores the selected example. For the closest match to the PSD typography, install Impact and Avenir Next Condensed. Fallback fonts can change line lengths.

## Publish on GitHub Pages

Use this folder as the root of a repository. In **Settings → Pages**, choose **Deploy from a branch**, then select the default branch and **/docs**. The editor uses static HTML, CSS, and JavaScript with relative paths. The site needs no build, API keys, or server code. [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

Run the local preview from the repository root.

```sh
python3 -m http.server 8000 --directory docs
```

Open `http://localhost:8000`.

### Prompt for a coding assistant

> Deploy the static poster editor in `docs/` of this repository to GitHub Pages. Serve `docs/index.html` locally to verify that the three templates load and both download buttons work. Publish from the default branch and `/docs`, keep asset paths relative, and give me the deployed URL.

Edit the `content` and `settings` entries in [docs/templates.js](docs/templates.js) to set new defaults before publishing.

## Original layouts for Inkscape

Each of these files preserves the original layout with editable text on named layers. In Inkscape, press **T** and select a text object to edit it or change its size. Adjust the line breaks if the new copy runs long. The single-speaker original also uses Adobe Heiti Std for a few punctuation runs.

| Layout | Editable SVG |
| --- | --- |
| One speaker · 26 October | [Download SVG](poster-1-speaker-1026.svg) |
| Two speakers · Ying Long and Chen Zhong · 23 July | [Download SVG](poster-2-speakers-0723.svg) |
| Three speakers · 28 January | [Download SVG](poster-3-speakers-0116.svg) |

On GitHub, open a file and use **Download raw file** to save a copy.
