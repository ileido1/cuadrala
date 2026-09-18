import 'package:flutter/services.dart';

const onboardingDocumentMaxLength = 20;
const onboardingNameMaxLength = 200;
const onboardingCityMaxLength = 120;
const onboardingLocationLabelMaxLength = 200;

final _digitsOnlyPattern = RegExp(r'^\d+$');
final _coordinatePattern = RegExp(r'^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$');
final _coordinateEditPattern = RegExp(r'^[+-]?(?:\d*(?:\.\d*)?)?$');

bool isValidOnboardingDocument(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ||
      (trimmed.length <= onboardingDocumentMaxLength &&
          _digitsOnlyPattern.hasMatch(trimmed));
}

bool isValidOnboardingName(String value) {
  final trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= onboardingNameMaxLength;
}

bool isValidOnboardingCity(String value) {
  return value.trim().length <= onboardingCityMaxLength;
}

bool isValidCoordinateSyntax(String value) {
  final trimmed = value.trim();
  return _coordinatePattern.hasMatch(trimmed) &&
      double.tryParse(trimmed)?.isFinite == true;
}

bool isValidLatitude(String value) {
  final parsed = _parseCoordinate(value);
  return parsed != null && parsed >= -90 && parsed <= 90;
}

bool isValidLongitude(String value) {
  final parsed = _parseCoordinate(value);
  return parsed != null && parsed >= -180 && parsed <= 180;
}

double? _parseCoordinate(String value) {
  final trimmed = value.trim();
  if (!_coordinatePattern.hasMatch(trimmed)) return null;
  final parsed = double.tryParse(trimmed);
  return parsed?.isFinite == true ? parsed : null;
}

TextInputFormatter coordinateInputFormatter() {
  return TextInputFormatter.withFunction((oldValue, newValue) {
    if (_coordinateEditPattern.hasMatch(newValue.text)) {
      return newValue;
    }
    return oldValue;
  });
}
