import 'package:dio/dio.dart';

/// User-friendly message for API / network failures.
String formatApiError(Object error) {
  if (error is DioException) {
    return _friendlyDioMessage(error);
  }
  final text = error.toString();
  if (text.startsWith('Exception: ')) {
    return text.substring('Exception: '.length);
  }
  return text;
}

String _friendlyDioMessage(DioException e) {
  final data = e.response?.data;
  if (data is Map && data['error'] is String) {
    return data['error'] as String;
  }

  final raw = (e.message ?? '').toLowerCase();
  final isUnreachable = e.type == DioExceptionType.connectionError ||
      raw.contains('host') ||
      raw.contains('network') ||
      raw.contains('socket') ||
      raw.contains('failed');

  if (isUnreachable) {
    return 'Cannot reach the server. On a real phone, set API_BASE_URL in mobile/.env to your computer\'s IP (e.g. http://192.168.1.5:8080), not localhost.';
  }

  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return 'Request timed out. Try again.';
    case DioExceptionType.badResponse:
      return 'Server error (${e.response?.statusCode ?? ''}).';
    default:
      return e.message?.isNotEmpty == true ? e.message! : 'Something went wrong';
  }
}
