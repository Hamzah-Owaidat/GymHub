import 'package:flutter/material.dart';

import '../../services/api_service.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _api = ApiService.instance;
  final _email = TextEditingController();
  final _otp = TextEditingController();
  final _password = TextEditingController();
  bool _sending = false;
  bool _resetting = false;

  Future<void> _sendOtp() async {
    setState(() => _sending = true);
    try {
      await _api.requestOtp(_email.text.trim());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('OTP sent. It expires in 5 minutes.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _reset() async {
    setState(() => _resetting = true);
    try {
      await _api.resetPassword(_email.text.trim(), _otp.text.trim(), _password.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password reset successful')));
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _resetting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: _sending ? null : _sendOtp, child: Text(_sending ? 'Sending...' : 'Send OTP')),
          const SizedBox(height: 16),
          TextField(controller: _otp, decoration: const InputDecoration(labelText: 'OTP code')),
          const SizedBox(height: 12),
          TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'New password')),
          const SizedBox(height: 16),
          FilledButton(onPressed: _resetting ? null : _reset, child: Text(_resetting ? 'Updating...' : 'Reset password')),
        ],
      ),
    );
  }
}
