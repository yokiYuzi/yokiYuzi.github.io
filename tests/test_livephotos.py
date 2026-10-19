"""Exercise real HEIC/HEVC decoding, sound, orientation, packaging, and site generation."""
import io
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from PIL import Image
from build_site import build
from livephotos import convert, executable, probe, render_gallery, run, select_pair


class LivePhotosTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix='livephoto-tests-')
        cls.fixtures = Path(cls.temporary.name)
        cls.movie = cls.fixtures / 'source.mov'
        run([executable('ffmpeg'), '-hide_banner', '-loglevel', 'error', '-y',
             '-f', 'lavfi', '-i', 'testsrc2=size=96x64:rate=12:duration=1.5',
             '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.5',
             '-c:v', 'libx265', '-x265-params', 'pools=1:log-level=error',
             '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', str(cls.movie)])

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def setUp(self):
        self.workspace = tempfile.TemporaryDirectory(prefix='livephoto-case-')
        self.addCleanup(self.workspace.cleanup)
        self.root = Path(self.workspace.name) / 'source'
        self.media = self.root / 'column' / 'media'
        self.media.mkdir(parents=True)
        self.output = Path(self.workspace.name) / 'site'

    def package(self, kind='HEIF', movie=None, name='海边 moment.LIVP', orientation=None):
        data = io.BytesIO()
        photo = Image.new('RGB', (96, 64), (180, 80, 40))
        options = {}
        if orientation:
            exif = Image.Exif()
            exif[274] = orientation
            options['exif'] = exif
        photo.save(data, kind, **options)
        path = self.media / name
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('nested/IMG_0001.' + ('HEIC' if kind == 'HEIF' else 'JPG'), data.getvalue())
            archive.write(movie or self.movie, 'nested/IMG_0001.MOV')
            archive.writestr('__MACOSX/._IMG_0001.HEIC', b'ignored metadata')
        return path

    def test_heic_hevc_full_motion_and_audio(self):
        source = self.package()
        item = convert(source, self.root, self.output)
        with Image.open(self.output / item['photo'].lstrip('/')) as photo:
            self.assertEqual(photo.size, (96, 64))
            self.assertEqual(photo.format, 'JPEG')
        video = probe(self.output / item['video'].lstrip('/'))
        self.assertIn('h264', [s['codec_name'] for s in video['streams']])
        self.assertIn('aac', [s['codec_name'] for s in video['streams']])
        self.assertAlmostEqual(item['duration'], 1.5, delta=.15)
        self.assertTrue(item['hasAudio'])
        self.assertIn('%20', item['original'])
        self.assertTrue(source.exists())

    def test_photo_and_video_rotation(self):
        rotated = Path(self.workspace.name) / 'rotated.mov'
        run([executable('ffmpeg'), '-loglevel', 'error', '-y', '-display_rotation', '90',
             '-i', str(self.movie), '-c', 'copy', str(rotated)])
        item = convert(self.package(kind='JPEG', movie=rotated, orientation=6), self.root, self.output)
        self.assertEqual((item['width'], item['height']), (64, 96))
        self.assertEqual((item['videoWidth'], item['videoHeight']), (64, 96))

    def test_hdr_and_silent_video(self):
        hdr = Path(self.workspace.name) / 'hdr.mov'
        run([executable('ffmpeg'), '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
             'testsrc2=size=96x64:rate=12:duration=1', '-c:v', 'libx265',
             '-x265-params', 'pools=1:log-level=error:colorprim=bt2020:transfer=arib-std-b67:colormatrix=bt2020nc', '-pix_fmt', 'yuv420p10le',
             '-color_primaries', 'bt2020', '-color_trc', 'arib-std-b67',
             '-colorspace', 'bt2020nc', str(hdr)])
        item = convert(self.package(movie=hdr), self.root, self.output)
        self.assertTrue(item['hdrPreviewConvertedToSDR'])
        self.assertFalse(item['hasAudio'])
        video = probe(self.output / item['video'].lstrip('/'))['streams'][0]
        self.assertEqual(video['color_transfer'], 'bt709')
        self.assertEqual(video['pix_fmt'], 'yuv420p')

    def test_reject_missing_or_ambiguous_components(self):
        for names in [('image.jpg',), ('a.jpg', 'b.heic', 'clip.mov'), ('../../image.jpg', 'clip.mov')]:
            with self.subTest(names=names):
                data = io.BytesIO()
                with zipfile.ZipFile(data, 'w') as archive:
                    for name in names:
                        archive.writestr(name, b'invalid')
                data.seek(0)
                with zipfile.ZipFile(data) as archive, self.assertRaises(ValueError):
                    select_pair(archive)

    def test_build_gallery_original_download_and_escaping(self):
        source = self.package(kind='JPEG')
        source.with_suffix('.json').write_text(json.dumps({'title': '<script>test</script>',
            'caption': 'Quotes " & waves', 'date': '2026-10-18',
            'article': '/column/posts/test-essay/'}), encoding='utf-8')
        article = self.root / 'column/posts/test-essay/index.html'
        article.parent.mkdir(parents=True)
        article.write_text('Essay<!-- LIVE_PHOTOS_START --><!-- LIVE_PHOTOS_END -->', encoding='utf-8')
        unrelated = self.root / 'column/posts/other-essay/index.html'
        unrelated.parent.mkdir(parents=True)
        unrelated.write_text('Other essay', encoding='utf-8')
        template = Path(__file__).resolve().parents[1] / 'column' / 'index.html'
        shutil.copy2(template, self.root / 'column' / 'index.html')
        items = build(self.root, self.output)
        page = (self.output / 'column' / 'index.html').read_text(encoding='utf-8')
        self.assertIn('data-live-photo', page)
        self.assertIn('&lt;script&gt;test&lt;/script&gt;', page)
        self.assertNotIn('<script>test</script>', page)
        self.assertIn('controls playsinline preload="none"', page)
        self.assertEqual(source.read_bytes(), (self.output / source.relative_to(self.root)).read_bytes())
        self.assertEqual(len(json.loads((self.output / 'column' / 'livephotos.json').read_text(encoding='utf-8'))), 1)
        self.assertIn(items[0]['video'], render_gallery(items))
        self.assertIn(items[0]['video'], (self.output / article.relative_to(self.root)).read_text(encoding='utf-8'))
        self.assertEqual((self.output / unrelated.relative_to(self.root)).read_text(encoding='utf-8'), 'Other essay')
        with self.assertRaises(ValueError):
            build(self.root, self.output)

    def test_bad_archive_stops_build(self):
        (self.media / 'bad.livp').write_bytes(b'not a zip archive')
        with self.assertRaisesRegex(RuntimeError, 'bad.livp'):
            build(self.root, self.output)


if __name__ == '__main__':
    unittest.main()
