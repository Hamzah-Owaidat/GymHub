import 'package:flutter/material.dart';

import '../screens/app_shell.dart';
import '../screens/auth/reset_password_screen.dart';
import '../screens/auth/sign_in_screen.dart';
import '../screens/auth/sign_up_screen.dart';
import '../screens/gyms/gym_details_screen.dart';
import '../screens/splash_screen.dart';

class AppRouter {
  static const splash = '/';
  static const signIn = '/signin';
  static const signUp = '/signup';
  static const resetPassword = '/reset-password';
  static const app = '/app';
  static const gymDetails = '/gym-details';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return MaterialPageRoute(builder: (_) => const SplashScreen());
      case signIn:
        return MaterialPageRoute(builder: (_) => const SignInScreen());
      case signUp:
        return MaterialPageRoute(builder: (_) => const SignUpScreen());
      case resetPassword:
        return MaterialPageRoute(builder: (_) => const ResetPasswordScreen());
      case app:
        return MaterialPageRoute(builder: (_) => const AppShell());
      case gymDetails:
        return MaterialPageRoute(
          builder: (_) => GymDetailsScreen(gymId: settings.arguments as int),
        );
      default:
        return MaterialPageRoute(builder: (_) => const SignInScreen());
    }
  }
}
