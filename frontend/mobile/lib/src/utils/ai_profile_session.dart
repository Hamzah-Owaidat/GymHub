/// In-memory AI profile for the current app session (cleared on logout / app restart).
class AiProfileSession {
  AiProfileSession._();

  static Map<String, dynamic>? data;

  static Map<String, dynamic>? load() {
    if (data == null || data!.isEmpty) return null;
    return Map<String, dynamic>.from(data!);
  }

  static void save(Map<String, dynamic> profile) {
    final cleaned = <String, dynamic>{};
    profile.forEach((k, v) {
      if (v == null) return;
      if (v is String && v.trim().isEmpty) return;
      cleaned[k] = v;
    });
    data = cleaned.isEmpty ? null : cleaned;
  }

  static void clear() {
    data = null;
  }
}
