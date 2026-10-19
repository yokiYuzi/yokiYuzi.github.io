"""Turn repository LIVP archives into full-size JPEG + H.264/AAC previews."""
from __future__ import annotations

import hashlib
import html
import io
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tempfile
from urllib.parse import quote
import zipfile

from PIL import Image, ImageCms, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener(thumbnails=False)
IMAGE_TYPES = {'.heic', '.heif', '.jpg', '.jpeg', '.png'}
VIDEO_TYPES = {'.mov', '.mp4', '.m4v'}
MAX_UNPACKED = 512 * 1024 * 1024


def run(command: list[str]) -> str:
    result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8',
                            errors='replace', timeout=600)
    if result.returncode:
        raise RuntimeError(f'{Path(command[0]).name} failed: {result.stderr[-3000:]}')
    return result.stdout


def executable(name: str) -> str:
    value = os.environ.get(name.upper()) or shutil.which(name)
    if not value:
        raise RuntimeError(f'Install {name} or set the {name.upper()} environment variable.')
    return value


def probe(path: Path) -> dict:
    return json.loads(run([executable('ffprobe'), '-v', 'error', '-show_streams',
                           '-show_format', '-of', 'json', str(path)]))


def select_pair(archive: zipfile.ZipFile) -> tuple[zipfile.ZipInfo, zipfile.ZipInfo]:
    entries = archive.infolist()
    if len(entries) > 100 or sum(item.file_size for item in entries) > MAX_UNPACKED:
        raise ValueError('LIVP archive exceeds the supported unpacked size or entry count.')
    files = [item for item in entries if not item.is_dir() and
             not any(part.startswith(('.', '__MACOSX')) for part in PurePosixPath(item.filename).parts)]
    images = [item for item in files if PurePosixPath(item.filename).suffix.lower() in IMAGE_TYPES]
    videos = [item for item in files if PurePosixPath(item.filename).suffix.lower() in VIDEO_TYPES]
    if len(images) != 1 or len(videos) != 1:
        raise ValueError('A LIVP must contain exactly one photo and one video; split multi-photo exports first.')
    return images[0], videos[0]


def write_photo(source: Path, target: Path) -> tuple[int, int]:
    with Image.open(source) as original:
        photo = ImageOps.exif_transpose(original).convert('RGB')
        profile = original.info.get('icc_profile')
        if profile:
            photo = ImageCms.profileToProfile(photo, ImageCms.ImageCmsProfile(io.BytesIO(profile)),
                                               ImageCms.createProfile('sRGB'), outputMode='RGB')
        # Keep every pixel; the browser controls the display size. The original archive is retained.
        photo.save(target, 'JPEG', quality=95, subsampling=0, optimize=True,
                   icc_profile=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes())
        return photo.size


def write_video(source: Path, target: Path) -> dict:
    info = probe(source)
    stream = next((s for s in info['streams'] if s['codec_type'] == 'video' and
                   not s.get('disposition', {}).get('attached_pic')), None)
    if stream is None:
        raise ValueError('The video component has no playable video stream.')
    filters = []
    hdr = stream.get('color_transfer') in {'smpte2084', 'arib-std-b67'}
    if hdr:
        filters.append('zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,'
                       'tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv')
    # Pad odd dimensions by one pixel instead of cropping or stretching the original framing.
    filters.append('pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p')
    command = [executable('ffmpeg'), '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
               '-i', str(source), '-map', f'0:{stream["index"]}', '-map', '0:a:0?',
               '-vf', ','.join(filters), '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
               '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
               '-map_metadata', '-1', '-metadata:s:v:0', 'rotate=0']
    if hdr:
        command += ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709']
    run(command + [str(target)])
    output = probe(target)
    video = next(s for s in output['streams'] if s['codec_type'] == 'video')
    return {'duration': float(output['format']['duration']), 'videoWidth': video['width'],
            'videoHeight': video['height'], 'hasAudio': any(s['codec_type'] == 'audio' for s in output['streams']),
            'hdrPreviewConvertedToSDR': hdr}


def convert(source: Path, root: Path, destination: Path) -> dict:
    relative = source.relative_to(root).as_posix()
    digest = hashlib.sha256(relative.encode('utf-8'))
    with source.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    asset_id = digest.hexdigest()[:24]
    folder = destination / 'assets' / 'livephotos' / asset_id
    folder.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source) as archive, tempfile.TemporaryDirectory(prefix='livp-') as temporary:
        image_entry, video_entry = select_pair(archive)
        extracted = []
        # Use fixed temporary filenames, never archive-supplied extraction paths.
        for prefix, entry in [('photo', image_entry), ('video', video_entry)]:
            target = Path(temporary) / (prefix + PurePosixPath(entry.filename).suffix.lower())
            with archive.open(entry) as incoming, target.open('wb') as outgoing:
                shutil.copyfileobj(incoming, outgoing)
            extracted.append(target)
        width, height = write_photo(extracted[0], folder / 'photo.jpg')
        video_info = write_video(extracted[1], folder / 'motion.mp4')

    metadata_path = source.with_suffix('.json')
    metadata = json.loads(metadata_path.read_text(encoding='utf-8')) if metadata_path.exists() else {}
    if not isinstance(metadata, dict) or any(not isinstance(metadata.get(k, ''), str)
                                           for k in ['title', 'caption', 'date', 'alt']):
        raise ValueError(f'Invalid caption metadata: {metadata_path.name}')
    title = metadata.get('title') or source.stem
    return {'id': asset_id, 'title': title, 'caption': metadata.get('caption', ''),
            'date': metadata.get('date', ''), 'alt': metadata.get('alt') or title,
            'photo': f'/assets/livephotos/{asset_id}/photo.jpg',
            'video': f'/assets/livephotos/{asset_id}/motion.mp4',
            'original': '/' + quote(relative, safe='/'), 'width': width, 'height': height,
            **video_info}


def render_gallery(items: list[dict]) -> str:
    escape = lambda text: html.escape(str(text), quote=True)
    cards = []
    for item in items:
        title, caption = escape(item['title']), escape(item['caption'])
        photo, video, original = (escape(item[key]) for key in ['photo', 'video', 'original'])
        label_id = 'live-title-' + item['id']
        cards.append(f'''<figure class="live-photo" data-live-photo>
  <div class="live-photo-stage" style="aspect-ratio:{item['width']}/{item['height']}">
    <img src="{photo}" alt="{escape(item['alt'])}" width="{item['width']}" height="{item['height']}" loading="lazy" decoding="async">
    <video controls playsinline preload="none" poster="{photo}" aria-labelledby="{label_id}">
      <source src="{video}" type="video/mp4">
      <a href="{video}">Download the motion video</a>
    </video>
    <span class="live-photo-badge" aria-hidden="true">◉ LIVE</span>
  </div>
  <figcaption>
    <h3 id="{label_id}">{title}</h3>
    {('<p>' + caption + '</p>') if caption else ''}
    <div class="live-photo-actions">
      <button type="button" data-live-play hidden>Play Live Photo</button>
      <a href="{photo}" target="_blank" rel="noopener">Full-size photo</a>
      <a href="{original}" download>Original .livp</a>
    </div>
    <p class="live-photo-status" role="status"></p>
  </figcaption>
</figure>''')
    return '\n'.join(cards)
