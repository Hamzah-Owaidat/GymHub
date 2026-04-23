import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:async';

import '../providers/auth_provider.dart';
import '../routes/app_router.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'chat/chat_screen.dart';
import 'gyms/gyms_screen.dart';
import 'home/home_screen.dart';
import 'profile/profile_screen.dart';
import 'sessions/sessions_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final _api = ApiService.instance;

  int _index = 0;
  int _unreadNotifications = 0;
  Timer? _notifTimer;

  static const _titles = ['Home', 'Gyms', 'Sessions', 'Chat', 'Profile'];

  bool _isProtectedTab(int index) => index == 2 || index == 4;

  @override
  void initState() {
    super.initState();
    _startNotificationsPolling();
  }

  @override
  void dispose() {
    _notifTimer?.cancel();
    super.dispose();
  }

  void _setTab(int i) {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated && _isProtectedTab(i)) {
      if (i == 4) {
        Navigator.pushNamed(context, AppRouter.signIn);
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to access this section.'),
        ),
      );
      return;
    }
    setState(() => _index = i);
  }

  void _startNotificationsPolling() {
    _notifTimer?.cancel();
    _notifTimer = Timer.periodic(const Duration(seconds: 20), (_) => _fetchUnreadCount());
    _fetchUnreadCount();
  }

  Future<void> _fetchUnreadCount() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      if (_unreadNotifications != 0 && mounted) setState(() => _unreadNotifications = 0);
      return;
    }
    try {
      final res = await _api.getNotifications(page: 1, limit: 1);
      final unread = res['unreadCount'];
      final count = unread is int ? unread : int.tryParse('${unread ?? 0}') ?? 0;
      if (mounted) setState(() => _unreadNotifications = count);
    } catch (_) {
      // silent
    }
  }

  Future<void> _openNotificationsSheet() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      Navigator.pushNamed(context, AppRouter.signIn);
      return;
    }

    List<Map<String, dynamic>> items = [];
    int unread = _unreadNotifications;
    bool loadedOnce = false;

    Future<void> load() async {
      final res = await _api.getNotifications(page: 1, limit: 30);
      items = (res['data'] as List? ?? const [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      final rawUnread = res['unreadCount'];
      unread = rawUnread is int ? rawUnread : int.tryParse('${rawUnread ?? 0}') ?? 0;
      if (mounted) setState(() => _unreadNotifications = unread);
    }

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            Future<void> refresh() async {
              await load();
              setModalState(() {});
            }

            if (!loadedOnce) {
              loadedOnce = true;
              refresh();
            }

            return SafeArea(
              child: SizedBox(
                height: MediaQuery.of(ctx).size.height * 0.75,
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 12, 8),
                      child: Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Notifications',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                            ),
                          ),
                          if (unread > 0)
                            TextButton(
                              onPressed: () async {
                                unread = await _api.markAllNotificationsRead();
                                for (final n in items) {
                                  n['is_read'] = true;
                                }
                                if (mounted) {
                                  setState(() => _unreadNotifications = unread);
                                }
                                setModalState(() {});
                              },
                              child: const Text('Mark all read'),
                            ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: refresh,
                        child: items.isEmpty
                            ? ListView(
                                children: [
                                  SizedBox(height: 140),
                                  Center(child: Text('No notifications yet')),
                                ],
                              )
                            : ListView.separated(
                                itemCount: items.length,
                                separatorBuilder: (_, _) => const Divider(height: 1),
                                itemBuilder: (_, i) {
                                  final n = items[i];
                                  final isRead = n['is_read'] == true;
                                  final idRaw = n['id'];
                                  final id = idRaw is int ? idRaw : int.tryParse('${idRaw ?? ''}');
                                  final title = n['title']?.toString() ?? 'Notification';
                                  final msg = n['message']?.toString() ?? '';
                                  final created = n['created_at']?.toString() ?? '';
                                  return ListTile(
                                    leading: CircleAvatar(
                                      radius: 16,
                                      backgroundColor: isRead
                                          ? Colors.grey.withValues(alpha: 0.15)
                                          : AppTheme.brand.withValues(alpha: 0.14),
                                      child: Icon(
                                        isRead ? Icons.notifications_none_rounded : Icons.notifications_active_rounded,
                                        size: 17,
                                        color: isRead ? Colors.grey : AppTheme.brand,
                                      ),
                                    ),
                                    title: Text(
                                      title,
                                      style: TextStyle(
                                        fontWeight: isRead ? FontWeight.w500 : FontWeight.w700,
                                      ),
                                    ),
                                    subtitle: Text(
                                      msg.isEmpty ? created : '$msg\n$created',
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    onTap: () async {
                                      if (isRead || id == null) return;
                                      unread = await _api.markNotificationRead(id);
                                      n['is_read'] = true;
                                      if (mounted) {
                                        setState(() => _unreadNotifications = unread);
                                      }
                                      setModalState(() {});
                                    },
                                  );
                                },
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final firstName = auth.user?['first_name']?.toString() ?? '';

    final screens = <Widget>[
      HomeScreen(onOpenTab: _setTab),
      const GymsScreen(),
      const SessionsScreen(),
      const ChatScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: _index == 0
            ? _BrandTitle(firstName: firstName, isAuth: auth.isAuthenticated)
            : Text(_titles[_index]),
        centerTitle: false,
        actions: [
          if (auth.isAuthenticated)
            IconButton(
              tooltip: 'Notifications',
              onPressed: _openNotificationsSheet,
              icon: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(Icons.notifications_none_rounded),
                  if (_unreadNotifications > 0)
                    Positioned(
                      right: -2,
                      top: -2,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppTheme.brand,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        constraints: const BoxConstraints(minWidth: 16, minHeight: 14),
                        child: Text(
                          _unreadNotifications > 99 ? '99+' : '$_unreadNotifications',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          if (!auth.isAuthenticated)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: FilledButton.tonalIcon(
                onPressed: () => Navigator.pushNamed(context, AppRouter.signIn),
                icon: const Icon(Icons.login_rounded, size: 18),
                label: const Text('Login'),
              ),
            ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: IndexedStack(index: _index, children: screens),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _setTab,
        destinations: [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.fitness_center_outlined),
            selectedIcon: Icon(Icons.fitness_center_rounded),
            label: 'Gyms',
          ),
          NavigationDestination(
            icon: Icon(auth.isAuthenticated ? Icons.event_outlined : Icons.lock_outline_rounded),
            selectedIcon: Icon(auth.isAuthenticated ? Icons.event_rounded : Icons.lock_rounded),
            label: 'Sessions',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            selectedIcon: Icon(Icons.chat_bubble_rounded),
            label: 'Chat',
          ),
          NavigationDestination(
            icon: Icon(auth.isAuthenticated ? Icons.person_outline_rounded : Icons.login_rounded),
            selectedIcon: Icon(auth.isAuthenticated ? Icons.person_rounded : Icons.login_rounded),
            label: auth.isAuthenticated ? 'Profile' : 'Login',
          ),
        ],
      ),
    );
  }
}

class _BrandTitle extends StatelessWidget {
  const _BrandTitle({required this.firstName, required this.isAuth});

  final String firstName;
  final bool isAuth;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            gradient: AppTheme.brandGradient,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: AppTheme.brand.withValues(alpha: 0.4),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 18),
        ),
        const SizedBox(width: 10),
        Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'GymHub',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, height: 1),
            ),
            const SizedBox(height: 2),
            Text(
              isAuth && firstName.isNotEmpty ? 'Hi, $firstName' : 'Train smarter',
              style: TextStyle(
                fontSize: 11,
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.white60
                    : Colors.black54,
                fontWeight: FontWeight.w500,
                height: 1,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
