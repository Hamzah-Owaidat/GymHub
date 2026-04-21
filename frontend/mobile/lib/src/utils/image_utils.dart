import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Resolves a gym (or generic) image URL returned by the backend into an
/// absolute URL that the mobile app can load.
///
/// The backend may return:
///   * a full URL (e.g. https://example.com/img.png)
///   * an absolute path (e.g. /storage/gym/abc.jpg)
///   * a bare filename (e.g. abc.jpg) — legacy entries.
String? resolveGymImageUrl(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

  final base = (dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:8080').trim().replaceAll(RegExp(r'/+$'), '');
  if (raw.startsWith('/storage') || raw.startsWith('storage')) {
    final normalized = raw.startsWith('/') ? raw : '/$raw';
    return '$base$normalized';
  }
  return '$base/storage/gym/${raw.replaceAll(RegExp(r'^/+'), '')}';
}
