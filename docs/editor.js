(() => {
  const storageKey = 'ual-lecture-posters-v1';
  const sizes = {
    titleSize: ['Main title', 20, 460],
    subtitleSize: ['Subtitle / talk title', 12, 320],
    nameSize: ['Speaker name', 20, 240],
    bodySize: ['Other text', 20, 180],
  };
  const lineSpacing = {
    titleLineSpacing: ['Main title', 75, 200],
    subtitleLineSpacing: ['Subtitle / talk title', 75, 200],
    nameLineSpacing: ['Speaker name', 75, 200],
    bodyLineSpacing: ['Other text', 75, 200],
  };
  const spacing = {
    titleGap: ['Title to speaker block', 0, 1000],
    introGap: ['Name to talk / bio', 0, 1000],
    abstractGap: ['Talk title to abstract', 0, 1000],
    speakerGap: ['Between speaker sections', 0, 1000],
    lowerGap: ['Speaker area to lower section', 0, 1000],
    detailsGap: ['Abstract / agenda to date', 0, 1000],
  };
  const portraitSettings = {
    zoom: ['Zoom', 100, 300, 100],
    x: ['Horizontal position', -100, 100, 0],
    y: ['Vertical position', -100, 100, 0],
    saturation: ['Saturation', 0, 200, 100],
  };
  const number = new Intl.NumberFormat('en', {maximumFractionDigits: 2});
  const byId = id => document.getElementById(id);
  const fields = byId('fields');
  const preview = byId('poster');
  const pageSize = byId('page-size');
  const status = byId('save-status');
  const overflow = byId('overflow');
  const duplicate = value => JSON.parse(JSON.stringify(value));

  function fresh(id) {
    const {content, settings} = POSTER_TEMPLATES[id];
    return {
      content: duplicate(content),
      settings: {...settings},
      photos: content.speakers.map(() => null),
      portraitEdits: content.speakers.map(() => Object.fromEntries(
        Object.entries(portraitSettings).map(([key, [, , , value]]) => [key, value])
      )),
    };
  }

  function fillStrings(target, source) {
    if (!source) return;
    Object.keys(target).forEach(key => {
      if (typeof target[key] === 'string' && typeof source[key] === 'string') target[key] = source[key];
    });
  }

  function load() {
    const state = {active: '1', drafts: {}};
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      if (!stored) return state;
      if (Object.hasOwn(POSTER_TEMPLATES, stored.active)) state.active = stored.active;
      for (const id of Object.keys(POSTER_TEMPLATES)) {
        const saved = stored.drafts?.[id];
        if (!saved) continue;
        const draft = fresh(id);
        fillStrings(draft.content, saved.content);
        draft.content.speakers.forEach((speaker, index) => fillStrings(speaker, saved.content?.speakers?.[index]));
        for (const [key, [, min, max]] of Object.entries({...sizes, ...lineSpacing, ...spacing})) {
          const value = saved.settings?.[key];
          if (Number.isFinite(value) && value >= min && value <= max) draft.settings[key] = value;
        }
        const savedLower = saved.settings?.lowerSize;
        if (Number.isFinite(savedLower) && savedLower > 0) {
          draft.settings.lowerSize = Number.isFinite(saved.settings.subtitleSize) ? savedLower
            : savedLower * POSTER_TEMPLATES[id].settings.bodySize / draft.settings.bodySize;
        }
        if (!Number.isFinite(saved.settings?.subtitleSize)) {
          if (id === '1') draft.settings.subtitleSize = draft.settings.titleSize * .692;
          if (id === '3') draft.settings.subtitleSize = draft.settings.nameSize * .889;
        }
        draft.photos = draft.photos.map((_, index) => restorePhoto(saved.photos?.[index]));
        draft.portraitEdits.forEach((edits, index) => {
          for (const [key, [, min, max]] of Object.entries(portraitSettings)) {
            const value = saved.portraitEdits?.[index]?.[key];
            if (Number.isFinite(value) && value >= min && value <= max) edits[key] = value;
          }
        });
        state.drafts[id] = draft;
      }
    } catch {
      status.textContent = 'Draft storage unavailable';
    }
    return state;
  }

  function restorePhoto(photo) {
    const image = typeof photo === 'string' ? {src: photo, width: 1, height: 1} : photo;
    return isPhotoSource(image?.src) &&
      Number.isFinite(image.width) && image.width > 0 &&
      Number.isFinite(image.height) && image.height > 0 ? image : null;
  }

  function isPhotoSource(src) {
    return typeof src === 'string' && /^data:image\/(jpeg|png|webp);base64,./i.test(src);
  }

  const state = load();
  const current = () => state.drafts[state.active] ??= fresh(state.active);
  let panel = 'content';
  let saveTimer;
  let renderFrame;
  let output;

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      status.textContent = 'Saved on this device';
    } catch {
      status.textContent = 'Draft is open in this tab';
    }
  }

  function requestSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 220);
  }

  function render() {
    output = PosterLayout.makePoster(POSTER_TEMPLATES[state.active], current());
    preview.replaceChildren(output.root);
    byId('paper-style').textContent = `@page { size: 297mm ${output.root.getAttribute('height')}; margin: 0; }`;
    const extended = output.height > PosterLayout.A3_HEIGHT;
    const mm = Math.round(420 * output.height / PosterLayout.A3_HEIGHT);
    pageSize.textContent = extended ? `297 × ${mm} mm` : 'A3 · 297 × 420 mm';
    overflow.hidden = !extended;
    overflow.textContent = extended
      ? 'The page grew to fit your content. Reduce copy, type size, or spacing to return to A3.'
      : '';
  }

  function update() {
    cancelAnimationFrame(renderFrame);
    renderFrame = requestAnimationFrame(render);
    requestSave();
  }

  function el(tag, attributes = {}, text = '') {
    const node = document.createElement(tag);
    Object.assign(node, attributes);
    if (text) node.textContent = text;
    return node;
  }

  function section(label) {
    const group = el('section', {className: 'field-group'});
    group.append(el('h3', {}, label));
    return group;
  }

  function field(label, input) {
    const group = el('div', {className: 'field'});
    group.append(el('label', {htmlFor: input.id}, label), input);
    return group;
  }

  function displayRange(input) {
    const value = input.valueAsNumber;
    const progress = (value - Number(input.min)) / (Number(input.max) - Number(input.min));
    const text = number.format(value) + input.dataset.unit;
    input.style.setProperty('--progress', `${progress * 100}%`);
    input.setAttribute('aria-valuetext', text);
    input.parentElement.querySelector('output').value = text;
  }

  function rangeField(id, label, min, max, value, unit, data) {
    const input = el('input', {id, type: 'range', min, max, step: 'any', value});
    Object.assign(input.dataset, data, {unit});
    const group = el('div', {className: 'field range-field'});
    const heading = el('div', {className: 'range-heading'});
    const output = el('output');
    output.setAttribute('for', id);
    output.setAttribute('aria-hidden', 'true');
    heading.append(el('label', {htmlFor: id}, label), output);
    group.append(heading, input);
    displayRange(input);
    return group;
  }

  function copyField(parent, label, key, value, rows, index) {
    const input = el(rows ? 'textarea' : 'input', {id: `copy-${index ?? 'poster'}-${key}`, value});
    if (rows) input.rows = rows;
    input.dataset.copy = key;
    if (index !== undefined) input.dataset.speaker = index;
    parent.append(field(label, input));
  }

  function renderContent() {
    const draft = current();
    const {content} = draft;
    if (state.active !== '2') {
      const titles = section('Poster title');
      if (state.active === '1') copyField(titles, 'Event label', 'eventLabel', content.eventLabel);
      copyField(titles, 'Title', 'title', content.title, 2);
      if (state.active === '1') copyField(titles, 'Subtitle', 'subtitle', content.subtitle, 2);
      fields.append(titles);
    }
    const speakers = section('Speakers');
    content.speakers.forEach((person, index) => {
      const item = el('details', {open: index === 0});
      const summary = el('summary', {}, person.name || `Speaker ${index + 1}`);
      summary.id = `speaker-summary-${index}`;
      item.append(summary);
      const group = el('div', {className: 'speaker-fields'});
      if (state.active === '2') {
        copyField(group, 'Lecture title', 'headline', person.headline, 2, index);
        copyField(group, 'Subtitle', 'subtitle', person.subtitle, 2, index);
      }
      copyField(group, 'Name', 'name', person.name, 0, index);
      copyField(group, 'Affiliation', 'affiliation', person.affiliation, 0, index);
      if (state.active === '3') copyField(group, 'Talk title', 'talk', person.talk, 2, index);
      copyField(group, state.active === '1' ? 'Biography' : 'Talk abstract', 'body', person.body, 5, index);
      const file = el('input', {id: `photo-${index}`, type: 'file', accept: 'image/jpeg,image/png,image/webp'});
      file.dataset.photo = index;
      group.append(field('Replace portrait', file));
      const controls = el('div', {className: 'portrait-controls'});
      controls.append(el('h4', {}, 'Portrait adjustments'));
      controls.append(el('p', {className: 'layout-help'}, 'Zoom in to make more room to reposition the photo.'));
      const grid = el('div', {className: 'control-grid'});
      for (const [key, [label, min, max]] of Object.entries(portraitSettings)) {
        grid.append(rangeField(`portrait-${index}-${key}`, label, min, max,
          draft.portraitEdits[index][key], '%', {portrait: key, speaker: index}));
      }
      controls.append(grid);
      group.append(controls);
      item.append(group);
      speakers.append(item);
    });
    fields.append(speakers);
    const details = section('Event information');
    if (state.active === '1') copyField(details, 'Abstract', 'lower', content.lower, 5);
    if (state.active === '3') copyField(details, 'Agenda', 'lower', content.lower, 5);
    if (state.active !== '1') copyField(details, 'Host line', 'host', content.host);
    copyField(details, 'Date and time', 'date', content.date);
    copyField(details, 'Venue', 'venue', content.venue, 2);
    fields.append(details);
  }

  function renderLayout() {
    for (const [title, definitions] of [['Font size', sizes], ['Line spacing', lineSpacing], ['Vertical spacing', spacing]]) {
      const group = section(title);
      const grid = el('div', {className: 'control-grid'});
      if (definitions === lineSpacing) {
        group.append(el('p', {className: 'layout-help'}, 'Adjust the space between lines. 100% uses the template default.'));
      }
      if (definitions === spacing) {
        group.append(el('p', {className: 'layout-help'}, 'Values use the poster’s 3508 px canvas. Sections move as the text wraps.'));
      }
      for (const [key, [label, min, max]] of Object.entries(definitions)) {
        if ((key === 'abstractGap' && state.active !== '3') ||
            (key === 'speakerGap' && state.active === '1') ||
            (key === 'detailsGap' && state.active === '2')) continue;
        const unit = definitions === lineSpacing ? '%' : ' px';
        grid.append(rangeField(key, label, min, max, current().settings[key], unit, {setting: key}));
      }
      group.append(grid);
      fields.append(group);
    }
  }

  function renderControls() {
    fields.replaceChildren();
    document.querySelectorAll('[data-template]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.template === state.active));
    });
    document.querySelectorAll('[data-panel]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.panel === panel));
    });
    if (panel === 'content') renderContent();
    else renderLayout();
    fields.scrollTop = 0;
  }

  function resizedPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const image = new Image();
      image.onload = () => {
        const original = {src: reader.result, width: image.naturalWidth, height: image.naturalHeight};
        if (!original.width || !original.height) {
          reject(new Error('Empty image'));
          return;
        }
        const scale = Math.min(1, 1600 / Math.max(original.width, original.height));
        if (scale === 1 && file.size <= 768 * 1024) {
          resolve(original);
          return;
        }
        try {
          const width = Math.max(1, Math.round(original.width * scale));
          const height = Math.max(1, Math.round(original.height * scale));
          const canvas = el('canvas', {width, height});
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);
          const src = canvas.toDataURL('image/jpeg', .91);
          resolve(isPhotoSource(src) ? {src, width, height} : original);
        } catch {
          resolve(original);
        }
      };
      image.onerror = () => reject(new Error('Invalid image'));
      reader.onload = () => {
        if (isPhotoSource(reader.result)) image.src = reader.result;
        else reject(new Error('Unsupported portrait format'));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  byId('templates').addEventListener('click', event => {
    const button = event.target.closest('[data-template]');
    if (!button || button.dataset.template === state.active) return;
    state.active = button.dataset.template;
    renderControls();
    update();
  });

  byId('tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-panel]');
    if (!button || button.dataset.panel === panel) return;
    panel = button.dataset.panel;
    renderControls();
  });

  fields.addEventListener('input', event => {
    const {target} = event;
    const {copy, speaker, setting, portrait} = target.dataset;
    const draft = current();
    if (setting || portrait) {
      const value = Math.round(target.valueAsNumber * 100) / 100;
      if (setting) draft.settings[setting] = value;
      else draft.portraitEdits[speaker][portrait] = value;
      target.value = value;
      displayRange(target);
    } else if (copy) {
      const record = speaker === undefined ? draft.content : draft.content.speakers[speaker];
      record[copy] = target.value;
      if (copy === 'name') byId(`speaker-summary-${speaker}`).textContent = target.value || `Speaker ${Number(speaker) + 1}`;
    } else return;
    update();
  });

  fields.addEventListener('change', async event => {
    const {target} = event;
    const {photo} = target.dataset;
    if (photo === undefined || !target.files.length) return;
    const file = target.files[0];
    const template = state.active;
    const draft = current();
    try {
      const image = await resizedPhoto(file);
      if (target.files[0] !== file || state.drafts[template] !== draft) return;
      draft.photos[photo] = image;
      update();
    } catch {
      if (target.files[0] !== file) return;
      target.value = '';
      status.textContent = 'Could not open the portrait';
    }
  });

  byId('reset').addEventListener('click', () => {
    state.drafts[state.active] = fresh(state.active);
    renderControls();
    update();
  });

  function download(blob, name) {
    const href = URL.createObjectURL(blob);
    const link = el('a', {href, download: name});
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  function currentPoster() {
    cancelAnimationFrame(renderFrame);
    render();
    return output.root;
  }

  byId('download').addEventListener('click', () => {
    const svg = new XMLSerializer().serializeToString(currentPoster());
    download(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n', svg],
      {type: 'image/svg+xml;charset=utf-8'}), `ual-lecture-poster-${state.active}-speaker.svg`);
  });

  byId('download-pdf').addEventListener('click', async event => {
    const button = event.currentTarget;
    const label = button.querySelector('span');
    const message = byId('export-status');
    const filename = `ual-lecture-poster-${state.active}-speaker.pdf`;
    button.disabled = true;
    label.textContent = 'Preparing PDF…';
    message.hidden = true;
    try {
      download(await PosterPdf.fromSvg(currentPoster()), filename);
    } catch {
      message.textContent = 'Choose Save as PDF in the print dialog.';
      message.hidden = false;
      window.print();
    } finally {
      button.disabled = false;
      label.textContent = 'Download PDF';
    }
  });

  window.addEventListener('pagehide', persist);
  renderControls();
  render();
})();
