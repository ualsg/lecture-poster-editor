const PosterPdf = (() => {
  function writePage(jpeg, width, height, widthMm, heightMm) {
    const pageWidth = (widthMm * 72 / 25.4).toFixed(4);
    const pageHeight = (heightMm * 72 / 25.4).toFixed(4);
    const chunks = [];
    const offsets = [0];
    let length = 0;
    const append = chunk => {
      chunks.push(chunk);
      length += typeof chunk === 'string' ? chunk.length : chunk.size ?? chunk.byteLength;
    };
    const object = (...contents) => {
      offsets.push(length);
      append(`${offsets.length - 1} 0 obj\n`);
      contents.forEach(append);
      append('\nendobj\n');
    };
    const commands = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Poster Do\nQ\n`;
    append('%PDF-1.4\n');
    append(Uint8Array.of(0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a));
    object('<< /Type /Catalog /Pages 2 0 R >>');
    object('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      '/Resources << /XObject << /Poster 4 0 R >> >> /Contents 5 0 R >>');
    object(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.size} >>\nstream\n`,
    jpeg, '\nendstream');
    object(`<< /Length ${commands.length} >>\nstream\n${commands}endstream`);
    const xref = length;
    append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
    offsets.slice(1).forEach(offset => append(`${String(offset).padStart(10, '0')} 00000 n \n`));
    append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, {type: 'application/pdf'});
  }

  async function fromSvg(poster) {
    const [, , fullWidth, fullHeight] = poster.getAttribute('viewBox').split(/\s+/).map(Number);
    const widthMm = parseFloat(poster.getAttribute('width'));
    const heightMm = parseFloat(poster.getAttribute('height'));
    const scale = Math.min(1, Math.sqrt(12_000_000 / (fullWidth * fullHeight)), 8192 / fullHeight);
    const width = Math.max(1, Math.round(fullWidth * scale));
    const height = Math.max(1, Math.round(fullHeight * scale));
    const printable = poster.cloneNode(true);
    printable.setAttribute('width', width);
    printable.setAttribute('height', height);
    const markup = new XMLSerializer().serializeToString(printable);
    const image = await new Promise((resolve, reject) => {
      const item = new Image();
      item.onload = () => resolve(item);
      item.onerror = () => reject(new Error('Could not rasterize the poster'));
      item.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    try {
      const context = canvas.getContext('2d', {alpha: false});
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .96));
      if (jpeg?.type !== 'image/jpeg' || !jpeg.size) throw new Error('Could not encode the poster');
      return writePage(jpeg, width, height, widthMm, heightMm);
    } finally {
      canvas.width = canvas.height = 1;
    }
  }

  return {fromSvg, writePage};
})();
