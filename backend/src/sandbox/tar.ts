/** Minimal single-file USTAR builder — for Docker's putArchive, no dependency needed for one small text file. */
export function buildSingleFileTar(filename: string, content: string): Buffer {
  const data = Buffer.from(content, 'utf-8');
  const header = Buffer.alloc(512);

  header.write(filename, 0, 100, 'utf-8');
  header.write('000644 \0', 100, 8, 'utf-8'); // mode
  header.write('000000 \0', 108, 8, 'utf-8'); // uid
  header.write('000000 \0', 116, 8, 'utf-8'); // gid
  header.write(`${data.length.toString(8).padStart(11, '0')} `, 124, 12, 'utf-8'); // size
  header.write(
    `${Math.floor(Date.now() / 1000)
      .toString(8)
      .padStart(11, '0')} `,
    136,
    12,
    'utf-8',
  ); // mtime
  header.write('        ', 148, 8, 'utf-8'); // checksum placeholder
  header.write('0', 156, 1, 'utf-8'); // typeflag: regular file
  header.write('ustar\0', 257, 6, 'utf-8');
  header.write('00', 263, 2, 'utf-8');

  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'utf-8');

  const paddedSize = Math.ceil(data.length / 512) * 512;
  const dataBlock = Buffer.alloc(paddedSize);
  data.copy(dataBlock);

  const endBlocks = Buffer.alloc(1024);

  return Buffer.concat([header, dataBlock, endBlocks]);
}
