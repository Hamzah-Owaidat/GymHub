import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../routes/app_router.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _submitting = false;

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      await context.read<AuthProvider>().signIn(_email.text.trim(), _password.text);
      if (mounted) Navigator.pushReplacementNamed(context, AppRouter.app);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: width > 600 ? 420 : width - 32),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('GYMHUB', style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: const Color(0xFFFF7A00), fontWeight: FontWeight.w900)),
                const SizedBox(height: 24),
                TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 12),
                TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _submitting ? null : _submit,
                    child: Text(_submitting ? 'Signing in...' : 'Sign In'),
                  ),
                ),
                TextButton(
                  onPressed: () => Navigator.pushNamed(context, AppRouter.resetPassword),
                  child: const Text('Forgot password?'),
                ),
                TextButton(
                  onPressed: () => Navigator.pushNamed(context, AppRouter.signUp),
                  child: const Text('Create account'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
