import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'storage_service.dart';

class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  final _storage = StorageService();

  late final Dio dio = Dio(
    BaseOptions(
      baseUrl: dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:8080',
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      contentType: 'application/json',
    ),
  )..interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );

  String _extractError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['error'] is String) return data['error'] as String;
      return e.message ?? 'Network error';
    }
    return 'Unexpected error';
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final res = await dio.post('/api/auth/login', data: {'email': email, 'password': password});
      return Map<String, dynamic>.from(res.data as Map);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> register(Map<String, dynamic> body) async {
    try {
      await dio.post('/api/auth/register', data: body);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> requestOtp(String email) async {
    try {
      await dio.post('/api/auth/forgot-password/request-otp', data: {'email': email});
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> resetPassword(String email, String otp, String newPassword) async {
    try {
      await dio.post('/api/auth/forgot-password/reset', data: {
        'email': email,
        'otp': otp,
        'new_password': newPassword,
      });
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<List<dynamic>> getGyms() async {
    try {
      final res = await dio.get('/api/user/gyms');
      return (res.data['data'] as List<dynamic>? ?? []);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<Map<String, dynamic>> getGymById(int id) async {
    try {
      final res = await dio.get('/api/user/gyms/$id');
      return Map<String, dynamic>.from(res.data['gym'] as Map);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<List<dynamic>> getSessions() async {
    try {
      final res = await dio.get('/api/user/sessions');
      return (res.data['data'] as List<dynamic>? ?? []);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> bookSession(Map<String, dynamic> body) async {
    try {
      await dio.post('/api/user/sessions/book', data: body);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> subscribe(Map<String, dynamic> body) async {
    try {
      await dio.post('/api/user/subscriptions', data: body);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<List<dynamic>> getCards() async {
    try {
      final res = await dio.get('/api/user/cards');
      return (res.data['data'] as List<dynamic>? ?? []);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> createCard(Map<String, dynamic> body) async {
    try {
      await dio.post('/api/user/cards', data: body);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> setDefaultCard(int id) async {
    try {
      await dio.patch('/api/user/cards/$id/default');
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> deleteCard(int id) async {
    try {
      await dio.delete('/api/user/cards/$id');
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<List<dynamic>> getChats() async {
    try {
      final res = await dio.get('/api/user/chats');
      return (res.data['data'] as List<dynamic>? ?? []);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<List<dynamic>> getMessages(int sessionId) async {
    try {
      final res = await dio.get('/api/user/chats/$sessionId/messages');
      return (res.data['data'] as List<dynamic>? ?? []);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> sendMessage(int sessionId, String message) async {
    try {
      await dio.post('/api/user/chats/$sessionId/messages', data: {'message': message});
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }
}
