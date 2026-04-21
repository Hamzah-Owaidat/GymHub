import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider() {
    // Let the API service ask us to clear local auth when it sees a 401.
    _api.onUnauthorized = _handleUnauthorized;
  }

  final _api = ApiService.instance;
  final _storage = StorageService();

  bool loading = true;
  bool isAuthenticated = false;
  Map<String, dynamic>? user;
  List<String> permissions = const [];

  /// Called on app start. If we have a stored token, verify it against the
  /// backend (`/api/auth/me`). If the token is missing or invalid we simply
  /// land on the sign-in screen — no error spam.
  Future<void> bootstrap() async {
    final token = await _storage.getToken();
    if (token == null || token.isEmpty) {
      loading = false;
      isAuthenticated = false;
      notifyListeners();
      return;
    }

    try {
      final res = await _api.me();
      final freshUser = res['user'] is Map
          ? Map<String, dynamic>.from(res['user'] as Map)
          : await _storage.getUser();
      if (freshUser != null) {
        await _storage.saveAuth(token, freshUser);
      }
      user = freshUser;
      permissions = (res['permissions'] as List?)
              ?.map((e) => e.toString())
              .toList(growable: false) ??
          const [];
      isAuthenticated = true;
    } catch (_) {
      // /me failed — token likely expired or invalid.
      await _storage.clearAuth();
      user = null;
      permissions = const [];
      isAuthenticated = false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> signIn(
    String email,
    String password, {
    bool rememberMe = true,
  }) async {
    final data = await _api.login(email, password, rememberMe: rememberMe);
    final token = data['token']?.toString() ?? '';
    final me = Map<String, dynamic>.from(data['user'] as Map? ?? {});
    await _storage.saveAuth(token, me);
    isAuthenticated = true;
    user = me;
    permissions = (data['permissions'] as List?)
            ?.map((e) => e.toString())
            .toList(growable: false) ??
        const [];
    notifyListeners();
  }

  Future<void> register(Map<String, dynamic> body) => _api.register(body);

  Future<void> logout() async {
    await _storage.clearAuth();
    isAuthenticated = false;
    user = null;
    permissions = const [];
    notifyListeners();
  }

  Future<void> _handleUnauthorized() async {
    if (!isAuthenticated && user == null) return;
    await _storage.clearAuth();
    isAuthenticated = false;
    user = null;
    permissions = const [];
    notifyListeners();
  }
}
