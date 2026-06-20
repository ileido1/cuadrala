import 'package:phosphor_flutter/phosphor_flutter.dart';

/// Cuádrala icon catalog — wraps Phosphor (peso `Light`, stroke fino) para que
/// toda la app comparta una sola familia visual, igual que [BrandColors] hace
/// con los colores.
///
/// Las pantallas NUNCA deben referenciar `PhosphorIconsLight` ni `Icons`
/// directamente — siempre a través de estas constantes semánticas.
abstract final class AppIcons {
  // ─── Navegación / acciones genéricas ──────────────────────────────────────
  static const home = PhosphorIconsLight.house;
  static const bell = PhosphorIconsLight.bell;
  static const person = PhosphorIconsLight.user;
  static const people = PhosphorIconsLight.users;
  static const group = PhosphorIconsLight.usersThree;
  static const personAdd = PhosphorIconsLight.userPlus;
  static const search = PhosphorIconsLight.magnifyingGlass;
  static const add = PhosphorIconsLight.plus;
  static const addCircle = PhosphorIconsLight.plusCircle;
  static const remove = PhosphorIconsLight.minus;
  static const removeCircle = PhosphorIconsLight.minusCircle;
  static const close = PhosphorIconsLight.x;
  static const closeCircle = PhosphorIconsLight.xCircle;
  static const check = PhosphorIconsLight.check;
  static const checkCircle = PhosphorIconsLight.checkCircle;
  static const info = PhosphorIconsLight.info;
  static const warning = PhosphorIconsLight.warning;
  static const chevronRight = PhosphorIconsLight.caretRight;
  static const chevronLeft = PhosphorIconsLight.caretLeft;
  static const arrowForward = PhosphorIconsLight.arrowRight;
  static const arrowBack = PhosphorIconsLight.arrowLeft;
  static const moreHoriz = PhosphorIconsLight.dotsThree;
  static const list = PhosphorIconsLight.listBullets;
  static const sliders = PhosphorIconsLight.slidersHorizontal;
  static const star = PhosphorIconsLight.star;
  static const sparkle = PhosphorIconsLight.sparkle;
  static const refresh = PhosphorIconsLight.arrowClockwise;
  static const delete = PhosphorIconsLight.trash;
  static const signOut = PhosphorIconsLight.signOut;
  static const flag = PhosphorIconsLight.flag;
  static const explore = PhosphorIconsLight.compass;
  static const fire = PhosphorIconsLight.fire;
  static const work = PhosphorIconsLight.briefcase;
  static const wifiOff = PhosphorIconsLight.wifiSlash;

  // ─── Tiempo / calendario ───────────────────────────────────────────────────
  static const clock = PhosphorIconsLight.clock;
  static const calendar = PhosphorIconsLight.calendarBlank;
  static const calendarBusy = PhosphorIconsLight.calendarX;
  static const sun = PhosphorIconsLight.sun;
  static const sunset = PhosphorIconsLight.sunHorizon;
  static const moon = PhosphorIconsLight.moonStars;
  static const storm = PhosphorIconsLight.cloudLightning;

  // ─── Ubicación / mapa ──────────────────────────────────────────────────────
  static const pin = PhosphorIconsLight.mapPin;
  static const map = PhosphorIconsLight.mapTrifold;
  static const myLocation = PhosphorIconsLight.crosshair;
  static const navigationArrow = PhosphorIconsLight.navigationArrow;

  // ─── Contacto / identidad ──────────────────────────────────────────────────
  static const mail = PhosphorIconsLight.envelopeSimple;
  static const lock = PhosphorIconsLight.lockSimple;
  static const eyeOn = PhosphorIconsLight.eye;
  static const eyeOff = PhosphorIconsLight.eyeSlash;
  static const phone = PhosphorIconsLight.phone;
  static const camera = PhosphorIconsLight.camera;
  static const cake = PhosphorIconsLight.cake;
  static const badge = PhosphorIconsLight.identificationBadge;

  // ─── Dinero / pagos ────────────────────────────────────────────────────────
  static const payments = PhosphorIconsLight.money;
  static const creditCard = PhosphorIconsLight.creditCard;
  static const bank = PhosphorIconsLight.bank;
  static const receipt = PhosphorIconsLight.receipt;

  // ─── Social / comunicación ─────────────────────────────────────────────────
  static const chat = PhosphorIconsLight.chatCircle;
  static const share = PhosphorIconsLight.shareNetwork;
  static const send = PhosphorIconsLight.paperPlaneTilt;
  static const celebration = PhosphorIconsLight.confetti;

  // ─── Estado de partida / reproducción ──────────────────────────────────────
  static const play = PhosphorIconsLight.play;
  static const playCircle = PhosphorIconsLight.playCircle;
  static const stopCircle = PhosphorIconsLight.stopCircle;
  static const trophy = PhosphorIconsLight.trophy;
  static const scoreboard = PhosphorIconsLight.chartBar;
  static const bolt = PhosphorIconsLight.lightning;
  static const target = PhosphorIconsLight.target;
  static const eventBusy = PhosphorIconsLight.calendarX;

  // ─── Deportes ──────────────────────────────────────────────────────────────
  /// Genérico "deporte de raqueta" — Phosphor no tiene un ícono literal de
  /// cancha de pádel; es la mejor aproximación disponible (tab "Partidas").
  static const racquetSport = PhosphorIconsLight.racquet;
  static const tennisBall = PhosphorIconsLight.tennisBall;
  static const basketball = PhosphorIconsLight.basketball;
  static const soccerBall = PhosphorIconsLight.soccerBall;
  static const volleyball = PhosphorIconsLight.volleyball;
  static const esports = PhosphorIconsLight.gameController;
  static const restaurant = PhosphorIconsLight.forkKnife;

  // ─── Marca (social login) ──────────────────────────────────────────────────
  static const appleLogo = PhosphorIconsLight.appleLogo;
}
