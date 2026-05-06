import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';

import '../env/app_env.dart';
import '../failures/app_failure_mapper.dart';
import '../location/location_service.dart';
import '../network/api_client.dart';
import '../network/auth_token_interceptor.dart';
import '../network/inject_dio_extra_interceptor.dart';
import '../storage/flutter_secure_token_storage.dart';
import '../../features/auth/data/auth_api.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/data/secure_token_storage.dart';
import '../../features/auth/presentation/cubit/login_cubit.dart';
import '../../features/auth/presentation/cubit/register_cubit.dart';
import '../../features/auth/presentation/cubit/session_cubit.dart';
import '../../features/catalog/data/catalog_api.dart';
import '../../features/catalog/data/catalog_repository.dart';
import '../../features/home/presentation/cubit/home_cubit.dart';
import '../../features/chat/data/chat_api.dart';
import '../../features/chat/data/chat_repository.dart';
import '../../features/matches/data/matches_api.dart';
import '../../features/matches/data/matches_repository.dart';
import '../../features/matches/presentation/cubit/open_matches_cubit.dart';
import '../../features/monetization/data/monetization_api.dart';
import '../../features/monetization/data/monetization_repository.dart';
import '../../features/onboarding/data/onboarding_api.dart';
import '../../features/onboarding/data/onboarding_repository.dart';
import '../../features/onboarding/presentation/cubit/onboarding_cubit.dart';
import '../../features/profile/data/profile_api.dart';
import '../../features/profile/data/profile_repository.dart';

final GetIt getIt = GetIt.instance;

Future<void> setupDependencies() async {
  getIt.registerSingleton<AppEnv>(AppEnv.fromEnvironment());
  getIt.registerLazySingleton<AppFailureMapper>(AppFailureMapper.new);
  getIt.registerLazySingleton<LocationService>(
    () => const GeolocatorLocationService(),
  );

  getIt.registerLazySingleton<Dio>(() {
    final env = getIt<AppEnv>();
    final dio = Dio(
      BaseOptions(
        baseUrl: env.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 10),
        headers: const {'content-type': 'application/json'},
      ),
    );
    return dio;
  });

  getIt.registerLazySingleton<FlutterSecureStorage>(
    () => const FlutterSecureStorage(),
  );

  getIt.registerLazySingleton<SecureTokenStorage>(
    () => FlutterSecureTokenStorage(secureStorage: getIt<FlutterSecureStorage>()),
  );

  getIt.registerLazySingleton<ApiClient>(
    () => ApiClient(
      dio: getIt<Dio>(),
      failureMapper: getIt<AppFailureMapper>(),
    ),
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

  // Interceptores (token + retry) deben registrarse después de AuthRepository.
  getIt<Dio>().interceptors.addAll([
    InjectDioExtraInterceptor(dio: getIt<Dio>()),
    AuthTokenInterceptor(
      authRepository: getIt<AuthRepository>(),
      refreshSession: () => getIt<AuthRepository>().refresh(),
    ),
  ]);

  getIt.registerLazySingleton<CatalogApi>(() => DioCatalogApi(apiClient: getIt<ApiClient>()));
  getIt.registerLazySingleton<CatalogRepository>(
    () => CatalogRepository(catalogApi: getIt<CatalogApi>()),
  );

  getIt.registerLazySingleton<MatchesApi>(() => DioMatchesApi(apiClient: getIt<ApiClient>()));
  getIt.registerLazySingleton<MatchesRepository>(
    () => MatchesRepository(
      matchesApi: getIt<MatchesApi>(),
      catalogRepository: getIt<CatalogRepository>(),
    ),
  );

  getIt.registerLazySingleton<ProfileApi>(() => DioProfileApi(apiClient: getIt<ApiClient>()));
  getIt.registerLazySingleton<ProfileRepository>(
    () => ProfileRepository(profileApi: getIt<ProfileApi>()),
  );

  getIt.registerLazySingleton<ChatApi>(() => DioChatApi(apiClient: getIt<ApiClient>()));
  getIt.registerLazySingleton<ChatRepository>(
    () => ChatRepository(chatApi: getIt<ChatApi>()),
  );

  getIt.registerLazySingleton<MonetizationApi>(
    () => DioMonetizationApi(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<MonetizationRepository>(
    () => MonetizationRepository(
      monetizationApi: getIt<MonetizationApi>(),
      profileRepository: getIt<ProfileRepository>(),
    ),
  );

  getIt.registerLazySingleton<OnboardingApi>(
    () => DioOnboardingApi(apiClient: getIt<ApiClient>()),
  );
  getIt.registerLazySingleton<OnboardingRepository>(
    () => OnboardingRepository(api: getIt<OnboardingApi>()),
  );
  getIt.registerFactory<OnboardingCubit>(
    () => OnboardingCubit(
      repository: getIt<OnboardingRepository>(),
      profileRepository: getIt<ProfileRepository>(),
    ),
  );

  getIt.registerFactory<SessionCubit>(
    () => SessionCubit(
      authRepository: getIt<AuthRepository>(),
      onboardingRepository: getIt<OnboardingRepository>(),
    ),
  );
  getIt.registerFactory<LoginCubit>(
    () => LoginCubit(authRepository: getIt<AuthRepository>()),
  );
  getIt.registerFactory<RegisterCubit>(
    () => RegisterCubit(authRepository: getIt<AuthRepository>()),
  );

  getIt.registerFactory<HomeCubit>(
    () => HomeCubit(
      profileRepository: getIt<ProfileRepository>(),
      matchesRepository: getIt<MatchesRepository>(),
    ),
  );

  getIt.registerFactory<OpenMatchesCubit>(
    () => OpenMatchesCubit(matchesRepository: getIt<MatchesRepository>()),
  );
}

