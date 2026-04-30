import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';

import '../env/app_env.dart';
import '../failures/app_failure_mapper.dart';
import '../network/api_client.dart';
import '../storage/flutter_secure_token_storage.dart';
import '../../features/auth/data/auth_api.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/data/secure_token_storage.dart';
import '../../features/auth/presentation/cubit/login_cubit.dart';
import '../../features/auth/presentation/cubit/register_cubit.dart';
import '../../features/auth/presentation/cubit/session_cubit.dart';

final GetIt getIt = GetIt.instance;

Future<void> setupDependencies() async {
  getIt.registerSingleton<AppEnv>(AppEnv.fromEnvironment());
  getIt.registerLazySingleton<AppFailureMapper>(AppFailureMapper.new);

  getIt.registerLazySingleton<Dio>(() {
    final env = getIt<AppEnv>();
    return Dio(
      BaseOptions(
        baseUrl: env.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 10),
        headers: const {'content-type': 'application/json'},
      ),
    );
  });

  getIt.registerLazySingleton<ApiClient>(
    () => ApiClient(
      dio: getIt<Dio>(),
      failureMapper: getIt<AppFailureMapper>(),
    ),
  );

  getIt.registerLazySingleton<FlutterSecureStorage>(
    () => const FlutterSecureStorage(),
  );

  getIt.registerLazySingleton<SecureTokenStorage>(
    () => FlutterSecureTokenStorage(secureStorage: getIt<FlutterSecureStorage>()),
  );

  getIt.registerLazySingleton<AuthApi>(
    () => DioAuthApi(apiClient: getIt<ApiClient>()),
  );

  getIt.registerLazySingleton<AuthRepository>(
    () => AuthRepository(
      authApi: getIt<AuthApi>(),
      secureTokenStorage: getIt<SecureTokenStorage>(),
    ),
  );

  getIt.registerFactory<SessionCubit>(
    () => SessionCubit(authRepository: getIt<AuthRepository>()),
  );
  getIt.registerFactory<LoginCubit>(
    () => LoginCubit(authRepository: getIt<AuthRepository>()),
  );
  getIt.registerFactory<RegisterCubit>(
    () => RegisterCubit(authRepository: getIt<AuthRepository>()),
  );
}

