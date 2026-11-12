const PosterLayout = (() => {
  const SVG = 'http://www.w3.org/2000/svg';
  const XLINK = 'http://www.w3.org/1999/xlink';
  const INKSCAPE = 'http://www.inkscape.org/namespaces/inkscape';
  const SODIPODI = 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd';
  const XMLNS = 'http://www.w3.org/2000/xmlns/';
  const WIDTH = 3508;
  const A3_HEIGHT = 4961;
  const bodyFamily = "'Avenir Next Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif";
  const titleFamily = "Impact, Haettenschweiler, 'Roboto Condensed', 'Arial Narrow', sans-serif";
  const measure = document.createElement('canvas').getContext('2d');

  function svg(tag, attrs = {}, parent) {
    const el = document.createElementNS(SVG, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (parent) parent.appendChild(el);
    return el;
  }

  function layer(parent, label) {
    const el = svg('g', {}, parent);
    el.setAttributeNS(INKSCAPE, 'inkscape:groupmode', 'layer');
    el.setAttributeNS(INKSCAPE, 'inkscape:label', label);
    return el;
  }

  function image(parent, source, x, y, width, height, fit = 'none') {
    const el = svg('image', {x, y, width, height, preserveAspectRatio: fit}, parent);
    el.setAttributeNS(XLINK, 'xlink:href', source);
    return el;
  }

  function shadow(parent, id, dy, blur, opacity) {
    const el = svg('filter', {
      id, x: '-30%', y: '-30%', width: '160%', height: '175%',
      'color-interpolation-filters': 'sRGB',
    }, parent);
    svg('feGaussianBlur', {in: 'SourceAlpha', stdDeviation: blur}, el);
    svg('feOffset', {dx: -1, dy, result: 'shadow-shape'}, el);
    svg('feFlood', {'flood-color': '#000', 'flood-opacity': opacity}, el);
    svg('feComposite', {in2: 'shadow-shape', operator: 'in', result: 'shadow'}, el);
    const merge = svg('feMerge', {}, el);
    svg('feMergeNode', {in: 'shadow'}, merge);
    svg('feMergeNode', {in: 'SourceGraphic'}, merge);
  }

  function portraitImage(parent, defs, photo, edits, frame, index) {
    const {cx, cy, d} = frame;
    const {zoom = 100, x = 0, y = 0, saturation = 100} = edits || {};
    const scale = d * zoom / 100 / Math.min(photo.width, photo.height);
    const width = photo.width * scale;
    const height = photo.height * scale;
    const clipId = `portrait-clip-${index}`;
    const clip = svg('clipPath', {id: clipId}, defs);
    svg('circle', {cx, cy, r: d / 2}, clip);
    const clipped = svg('g', {'clip-path': `url(#${clipId})`}, parent);
    const portrait = image(clipped, photo.src,
      cx - width / 2 + (width - d) * x / 200,
      cy - height / 2 + (height - d) * y / 200, width, height);
    portrait.id = `portrait-photo-${index}`;
    if (saturation === 100) return;
    const filterId = `portrait-saturation-${index}`;
    const filter = svg('filter', {id: filterId, x: 0, y: 0, width: '100%', height: '100%',
      'color-interpolation-filters': 'sRGB'}, defs);
    const amount = saturation / 100;
    const luma = [.213, .715, .072].map(value => value * (1 - amount));
    const values = luma.flatMap((_, row) =>
      [...luma.map((value, col) => value + (row === col ? amount : 0)), 0, 0]
    ).concat([0, 0, 0, 1, 0]);
    svg('feColorMatrix', {type: 'matrix', values: values.map(value => value.toFixed(6)).join(' ')}, filter);
    portrait.setAttribute('filter', `url(#${filterId})`);
  }

  function font(size, weight = 400, family = bodyFamily, slant = 'normal') {
    return {size, weight, family, slant};
  }

  function widthOf(text, style) {
    measure.font = `${style.slant} ${style.weight} ${style.size}px ${style.family}`;
    return measure.measureText(text).width;
  }

  function wrap(runs, maxWidth) {
    const rows = [];
    let row = [];
    let rowWidth = 0;
    let space;
    const flush = () => {
      rows.push(row);
      row = [];
      rowWidth = 0;
      space = undefined;
    };
    const append = (text, style, width) => {
      const last = row[row.length - 1];
      if (last && last.style === style) last.text += text;
      else row.push({text, style});
      rowWidth += width;
    };
    for (const {text, style} of runs) {
      const pieces = text.match(/\n|[^\S\n]+|[^\s]+/gu) || [];
      for (const piece of pieces) {
        if (piece === '\n') {
          flush();
          continue;
        }
        if (!piece.trim()) {
          space = {text: piece.replace(/\t/g, '  '), style};
          continue;
        }
        const wordWidth = widthOf(piece, style);
        const spaceWidth = space ? widthOf(space.text, space.style) : 0;
        if (row.length && rowWidth + spaceWidth + wordWidth > maxWidth) flush();
        if (space) append(space.text, space.style, spaceWidth);
        space = undefined;
        if (wordWidth <= maxWidth) {
          append(piece, style, wordWidth);
          continue;
        }
        for (const character of piece) {
          const width = widthOf(character, style);
          if (row.length && rowWidth + width > maxWidth) flush();
          append(character, style, width);
        }
      }
    }
    if (row.length) flush();
    return rows;
  }

  function textBlock(parent, runs, options) {
    const {x, y, width, size, lineHeight = size * 1.2, lineSpacing = 100, fill = '#fff',
      anchor = 'start', opacity = 1, effect, id} = options;
    if (!runs.some(run => run.text.trim())) return 0;
    const rows = wrap(runs, width);
    const baselineStep = lineHeight * (lineSpacing / 100);
    const main = runs[0].style;
    const attrs = {
      x, y: y + size * .85, fill, opacity, 'text-anchor': anchor,
      'font-family': main.family, 'font-weight': main.weight, 'font-size': main.size,
      'font-style': main.slant,
    };
    if (effect) attrs.filter = `url(#${effect})`;
    if (id) attrs.id = id;
    const el = svg('text', attrs, parent);
    el.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
    rows.forEach((row, index) => {
      const line = svg('tspan', {x, y: y + size * .85 + index * baselineStep}, el);
      line.setAttributeNS(SODIPODI, 'sodipodi:role', 'line');
      for (const run of row) {
        if (run.style === main) line.append(run.text);
        else {
          svg('tspan', {'font-family': run.style.family, 'font-size': run.style.size,
            'font-weight': run.style.weight, 'font-style': run.style.slant}, line).textContent = run.text;
        }
      }
    });
    return (rows.length - 1) * baselineStep + size;
  }

  function agendaBlock(parent, content, y, size, lineSpacing) {
    const group = svg('g', {id: 'lower-copy'}, parent);
    const start = y;
    const lineHeight = size * 1.375 * (lineSpacing / 100);
    const normal = font(size, 500);
    const italic = font(size, 500, bodyFamily, 'italic');
    const bold = font(size, 700);
    for (const source of content.trimEnd().split('\n')) {
      const copy = source.trim();
      if (!copy) {
        y += lineHeight;
        continue;
      }
      const options = {x: 249, y, width: 3000, size, lineHeight, fill: '#323232'};
      const timed = copy.match(/^(\d{1,2}:\d{2}\s*[ap]m)\s+(.*)$/i);
      const indent = source.startsWith('  ') || source.startsWith('\t');
      const offset = timed ? Math.max(251, Math.ceil(widthOf(timed[1], italic) + 24)) : 251;
      if (timed) {
        textBlock(group, [{text: timed[1], style: italic}], {...options, width: offset});
      }
      const detail = timed ? timed[2] : copy;
      const speaker = detail.match(/^(.*\b(?:by|moderated by)\s+)(.+)$/i);
      const style = /^agenda:?$/i.test(detail) ? bold : indent || timed ? italic : normal;
      const runs = speaker ? [{text: speaker[1], style}, {text: speaker[2], style: bold}]
        : [{text: detail, style}];
      const width = indent || timed ? {...options, x: 249 + offset, width: 3071 - offset} : options;
      y += Math.max(size, textBlock(group, runs, width)) + lineHeight - size;
    }
    return y - start - lineHeight + size;
  }

  function makePoster(template, draft) {
    const {id, art, cards} = template;
    const {content, settings: s, photos, portraitEdits} = draft;
    const {titleLineSpacing = 100, subtitleLineSpacing = 100, nameLineSpacing = 100,
      bodyLineSpacing = 100} = s;
    const assets = POSTER_ARTWORK[id];
    const singleSpeaker = id === '1';
    const separateHeadlines = id === '2';
    const root = svg('svg', {width: '297mm', version: '1.1', role: 'img'});
    root.setAttributeNS(XMLNS, 'xmlns:xlink', XLINK);
    root.setAttributeNS(XMLNS, 'xmlns:inkscape', INKSCAPE);
    root.setAttributeNS(XMLNS, 'xmlns:sodipodi', SODIPODI);
    const heading = content.title || content.speakers[0].headline || 'Lecture poster';
    svg('title', {}, root).textContent = heading.replace(/\n/g, ' ');
    const defs = svg('defs', {}, root);
    shadow(defs, 'headline-shadow', 11, 3.5, .52);
    shadow(defs, 'portrait-shadow', 22, 20, .25);
    const background = layer(root, 'Artwork');
    svg('rect', {x: 0, y: 0, width: WIDTH, height: '100%', fill: '#fff'}, background);
    image(background, assets.header, 0, 0, WIDTH, art.headerHeight);
    const backdrop = svg('svg', {x: 0, y: art.headerHeight, width: WIDTH, overflow: 'hidden'}, background);

    const headlineStyle = font(s.titleSize, 400, titleFamily);
    const subtitleStyle = font(s.subtitleSize, 400, titleFamily);
    const bodyScale = s.bodySize / template.settings.bodySize;
    const lowerSize = s.lowerSize * bodyScale;
    const bodyStyle = font(s.bodySize);
    const nameStyle = font(s.nameSize, singleSpeaker ? 400 : 900, singleSpeaker ? titleFamily : bodyFamily);
    const affiliationSize = template.settings.nameSize * (singleSpeaker ? 2 / 3 : 1);
    const affiliationStyle = font(affiliationSize * bodyScale, 500);
    const talkStyle = font(s.subtitleSize, 700);
    let y = art.headerHeight + 84;
    const text = (parent, value, style, opts) => textBlock(parent, [{text: value, style}], {size: style.size, ...opts});
    const headline = (parent, value, key, subtitle, subtitleId) => {
      const h = text(parent, value, headlineStyle, {
        x: 186, y, width: 3145, lineHeight: s.titleSize * (separateHeadlines ? 1.2 : 1.077),
        lineSpacing: titleLineSpacing, effect: 'headline-shadow', id: key,
      });
      y += h;
      if (subtitle.trim()) {
        if (h) y += singleSpeaker ? 74 : 35;
        y += text(parent, subtitle, subtitleStyle, {
          x: 186, y, width: 3145, lineSpacing: subtitleLineSpacing,
          effect: 'headline-shadow', id: subtitleId,
        });
      }
      if (h || subtitle.trim()) y += s.titleGap;
    };
    if (!separateHeadlines) {
      const titles = layer(root, 'Lecture title');
      const labelHeight = text(titles, content.eventLabel,
        font(template.settings.titleSize * .385 * bodyScale, 400, titleFamily),
        {x: 186, y, width: 3135, lineSpacing: bodyLineSpacing, id: 'event-label'});
      if (labelHeight) y += labelHeight + 36;
      headline(titles, content.title, 'main-title', content.subtitle, 'subtitle');
    }

    const cardMetrics = [];
    content.speakers.forEach((speaker, index) => {
      if (index) y += s.speakerGap;
      const group = layer(root, `Speaker ${index + 1}`);
      if (separateHeadlines) headline(group, speaker.headline, `speaker-title-${index + 1}`,
        speaker.subtitle, `speaker-subtitle-${index + 1}`);
      const geom = cards[index];
      const cardY = y;
      const card = svg('g', {id: `speaker-card-${index + 1}`}, group);
      const panel = svg('rect', {x: geom.box[0], y: cardY, width: geom.box[1] - geom.box[0],
        rx: 55, fill: '#000', opacity: singleSpeaker ? .75 : .70}, card);
      const portraitLayer = svg('g', {}, card);
      const copy = svg('g', {}, card);
      const textX = geom.x;
      let top = cardY + geom.padding[0];
      const name = speaker.name.trim();
      const affiliation = speaker.affiliation.trim();
      const nameHeight = textBlock(copy, [
        {text: name, style: nameStyle},
        {text: (name && affiliation ? ', ' : '') + affiliation, style: affiliationStyle},
      ], {x: textX, y: top, width: geom.width,
        size: Math.max(name ? s.nameSize : 0, affiliation ? affiliationStyle.size : 0),
        lineSpacing: name ? nameLineSpacing : bodyLineSpacing, id: `speaker-name-${index + 1}`});
      top += nameHeight;
      if (speaker.talk.trim()) {
        if (nameHeight) top += s.introGap;
        top += text(copy, speaker.talk, talkStyle, {x: textX, y: top, width: geom.width,
          lineSpacing: subtitleLineSpacing, id: `speaker-talk-${index + 1}`});
        if (speaker.body.trim()) top += s.abstractGap;
      } else if (nameHeight && speaker.body.trim()) {
        top += s.introGap;
      }
      top += text(copy, speaker.body, bodyStyle, {
        x: textX, y: top, width: geom.width,
        lineHeight: s.bodySize * (singleSpeaker ? 1.4286 : id === '3' && index === 2 ? 1.1333 : 1.2),
        lineSpacing: bodyLineSpacing, opacity: geom.bodyOpacity, id: `speaker-description-${index + 1}`,
      });
      const [x1, y1, x2, y2] = geom.photo;
      const diameter = Math.min(x2 - x1, y2 - y1);
      const overlap = singleSpeaker ? 60 : id === '3' ? 12 : 0;
      const panelHeight = Math.max(Math.round(diameter * .66) - overlap, top + geom.padding[1] - cardY);
      panel.setAttribute('height', panelHeight);
      const d = Math.min(diameter, panelHeight + overlap);
      const cx = (x1 + x2) / 2;
      const cy = cardY + panelHeight / 2 + (separateHeadlines && index === 0 ? -15 : 0);
      svg('circle', {cx, cy, r: d / 2, fill: '#fff', filter: 'url(#portrait-shadow)'}, portraitLayer);
      const photo = photos[index] || {src: assets.portraits[index], width: x2 - x1, height: y2 - y1};
      portraitImage(portraitLayer, defs, photo, portraitEdits?.[index], {cx, cy, d}, index + 1);
      svg('circle', {cx, cy, r: d / 2, fill: 'none', stroke: '#fff', 'stroke-width': 11}, portraitLayer);
      cardMetrics.push({top: cardY, height: panelHeight});
      y = Math.max(cardY + panelHeight, cy + d / 2);
    });

    if (content.host.trim()) {
      y += 46;
      y += text(layer(root, 'Host'), content.host, font(template.settings.nameSize * bodyScale, 700), {
        x: 3284, y, width: 2950, lineSpacing: bodyLineSpacing, anchor: 'end', id: 'host',
      });
    }
    const heroBottom = y + art.tail;
    const heroHeight = heroBottom - art.headerHeight;
    backdrop.setAttribute('height', heroHeight);
    image(backdrop, assets.backdrop, 0, 0, WIDTH, heroHeight, 'xMidYMid slice');

    y = heroBottom + s.lowerGap;
    const lowerY = y;
    const lower = layer(root, 'Event information');
    let lowerHeight = 0;
    if (content.lower.trim()) {
      const style = font(lowerSize, 500);
      lowerHeight = singleSpeaker
        ? textBlock(lower, [
          {text: 'Abstract: ', style: font(lowerSize, 700)}, {text: content.lower, style},
        ], {x: 290, y, width: 3034, size: lowerSize, lineHeight: lowerSize * 4 / 3,
          lineSpacing: bodyLineSpacing, fill: '#323232', id: 'lower-copy'})
        : agendaBlock(lower, content.lower, y, lowerSize, bodyLineSpacing);
      svg('rect', {x: 175, y, width: 23, height: lowerHeight, fill: '#323232'}, lower);
      y += lowerHeight + s.detailsGap;
    }

    const detailsY = y;
    const detailSize = 66.67 * bodyScale;
    const detailFont = font(detailSize, 500);
    const detailBold = font(detailSize, 700);
    const detailOptions = {x: 276, width: 2360, size: detailSize, fill: '#323232',
      lineHeight: 96.5 * bodyScale, lineSpacing: bodyLineSpacing};
    const detailGap = (detailSize + 30) * (bodyLineSpacing / 100) - detailSize;
    let detailHeight = 0;
    for (const [label, value, key] of [['Date/time: ', content.date, 'date'], ['Venue: ', content.venue, 'venue']]) {
      if (value.trim()) {
        y += textBlock(lower, [{text: label, style: detailBold}, {text: value, style: detailFont}],
          {...detailOptions, y, id: key});
        detailHeight = y - detailsY;
        y += detailGap;
      }
    }
    if (detailHeight) svg('rect', {x: 175, y: detailsY, width: 23, height: detailHeight, fill: '#323232'}, lower);
    const [lx, ly, lx2, ly2] = art.logo;
    image(lower, assets.nus, lx, detailsY, lx2 - lx, ly2 - ly);
    const detailBottom = detailsY + Math.max(detailHeight, ly2 - ly);
    const height = Math.max(A3_HEIGHT, Math.ceil(detailBottom + 112 + art.footerHeight));
    image(background, assets.footer, 0, height - art.footerHeight, WIDTH, art.footerHeight);
    root.setAttribute('height', `${(420 * height / A3_HEIGHT).toFixed(3)}mm`);
    root.setAttribute('viewBox', `0 0 ${WIDTH} ${height}`);
    return {root, height, cardMetrics, lowerY, lowerHeight, detailsY};
  }

  return {makePoster, A3_HEIGHT};
})();
