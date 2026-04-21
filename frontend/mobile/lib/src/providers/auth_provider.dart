import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  final _api = ApiService.instance;
  final _storage = StorageService();

  bool loading = true;
  bool isAuthenticated = false;
  Map<String, dynamic>? user;

  Future<void> bootstrap() async {
    final token = await _storage.getToken();
    final cachedUser = await _storage.getUser();
    isAuthenticated = token != null && token.isNotEmpty;
    user = cachedUser;
    loading = false;
    notifyListeners();
  }

  Future<void> signIn(String email, String password) async {
    final data = await _api.login(email, password);
    final token = data['token']?.toString() ?? '';
    final me = Map<String, dynamic>.from(data['user'] as Map? ?? {});
    await _storage.saveAuth(token, me);
    isAuthenticated = true;
    user = me;
    notifyListeners();
  }

  Future<void> register(Map<String, dynamic> body) => _api.register(body);

  Future<void> logout() async {
    await _storage.clearAuth();
    isAuthenticated = false;
    user = null;
    notifyListeners();
  }
}
