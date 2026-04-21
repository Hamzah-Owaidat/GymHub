import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'storage_service.dart';

typedef UnauthorizedHandler = Future<void> Function();

class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  final _storage = StorageService();

  // Set by AuthProvider so we can clear state when the backend says the token
  // is no longer valid (e.g. expired / revoked).
  UnauthorizedHandler? onUnauthorized;

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
        onError: (err, handler) async {
          if (err.response?.statusCode == 401) {
            // Auth is no longer valid — wipe local session so the UI can bounce
            // the user back to sign-in.
            final cb = onUnauthorized;
            if (cb != null) {
              await cb();
            } else {
              await _storage.clearAuth();
            }
          }
          handler.next(err);
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

  // ---------- Auth ----------

  Future<Map<String, dynamic>> login(
    String email,
    String password, {
    bool rememberMe = true,
  }) async {
    try {
      final res = await dio.post('/api/auth/login', data: {
        'email': email,
        'password': password,
        'rememberMe': rememberMe,
      });
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

  Future<Map<String, dynamic>> me() async {
    try {
      final res = await dio.get('/api/auth/me');
      return Map<String, dynamic>.from(res.data as Map);
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

  // ---------- Gyms ----------

  Future<List<dynamic>> getGyms({String? search}) async {
    try {
      final res = await dio.get(
        '/api/user/gyms',
        queryParameters: {
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      return (res.data['data'] as List<dynamic>? ?? []);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  /// Returns `{ data: List, total: int }` so we can show a stat count on Home.
  Future<Map<String, dynamic>> getGymsPaged({
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final res = await dio.get(
        '/api/user/gyms',
        queryParameters: {
          if (search != null && search.isNotEmpty) 'search': search,
          'page': page,
          'limit': limit,
        },
      );
      final body = Map<String, dynamic>.from(res.data as Map);
      final List data = (body['data'] as List?) ?? const [];
      final pagination = body['pagination'] as Map? ?? const {};
      final total = pagination['total'] is int
          ? pagination['total'] as int
          : int.tryParse('${pagination['total'] ?? ''}') ?? data.length;
      return {'data': data, 'total': total};
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  /// Returns the full gym payload: { gym, images, plans, coaches,
  /// activeSubscription, userRating }.
  Future<Map<String, dynamic>> getGymDetails(int id) async {
    try {
      final res = await dio.get('/api/user/gyms/$id');
      return Map<String, dynamic>.from(res.data as Map);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<Map<String, dynamic>> getCoachAvailability({
    required int coachId,
    required int gymId,
    required String date,
  }) async {
    try {
      final res = await dio.get(
        '/api/user/coaches/$coachId/availability',
        queryParameters: {'gym_id': gymId, 'date': date},
      );
      return Map<String, dynamic>.from(res.data as Map);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  // ---------- Sessions ----------

  Future<List<dynamic>> getSessions() async {
    try {
      final res = await dio.get('/api/user/sessions');
      return (res.data['data'] as List<dynamic>? ?? []);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<Map<String, dynamic>> bookSession(Map<String, dynamic> body) async {
    try {
      final res = await dio.post('/api/user/sessions/book', data: body);
      return Map<String, dynamic>.from(res.data as Map);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  // ---------- Subscriptions ----------

  Future<Map<String, dynamic>> subscribe({
    required int planId,
    required String paymentMethod,
    String? cardLast4,
  }) async {
    try {
      final res = await dio.post('/api/user/subscriptions', data: {
        'plan_id': planId,
        'payment_method': paymentMethod,
        if (paymentMethod == 'card' && cardLast4 != null && cardLast4.isNotEmpty)
          'card_last4': cardLast4,
      });
      return Map<String, dynamic>.from(res.data as Map);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<List<dynamic>> getMySubscriptions() async {
    try {
      final res = await dio.get('/api/user/subscriptions');
      return (res.data['data'] as List<dynamic>? ?? []);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  // ---------- Cards ----------

  Future<List<dynamic>> getCards() async {
    try {
      final res = await dio.get('/api/user/cards');
      return (res.data['data'] as List<dynamic>? ?? []);
    } catch (e) {
      throw Exception(_extractError(e));
    }
  }

  Future<void> createCard({
    required String cardHolder,
    required String cardNumber,
    required String cardExpiry,
    String? cardLabel,
    bool isDefault = false,
  }) async {
    try {
      await dio.post('/api/user/cards', data: {
        if (cardLabel != null && cardLabel.isNotEmpty) 'card_label': cardLabel,
        'card_holder': cardHolder,
        'card_number': cardNumber,
        'card_expiry': cardExpiry,
        'is_default': isDefault,
      });
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

  // ---------- Chat ----------

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
