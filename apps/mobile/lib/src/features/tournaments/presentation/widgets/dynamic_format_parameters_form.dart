import 'package:flutter/material.dart';
import '../../data/models/format_parameter_field_def.dart';

class DynamicFormatParametersForm extends StatelessWidget {
  final List<FormatParameterFieldDef> fields;
  final Map<String, Object?> values;
  final void Function(String key, Object? value) onChanged;

  const DynamicFormatParametersForm({
    super.key,
    required this.fields,
    required this.values,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (fields.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      children: fields.map((field) {
        return _buildFieldWidget(context, field);
      }).toList(),
    );
  }

  Widget _buildFieldWidget(BuildContext context, FormatParameterFieldDef field) {
    if (field is BooleanFieldDef) {
      return SwitchListTile(
        title: Text(field.label),
        subtitle: field.required == true ? const Text('Requerido') : null,
        value: (values[field.key] as bool?) ?? false,
        onChanged: (value) => onChanged(field.key, value),
      );
    } else if (field is IntFieldDef) {
      final currentValue = (values[field.key] as int?) ?? (field.min ?? 1);
      return ListTile(
        title: Text(field.label),
        subtitle: field.required == true ? const Text('Requerido') : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.remove),
              onPressed: () {
                final newValue = (currentValue - 1);
                if (field.min == null || newValue >= field.min!) {
                  onChanged(field.key, newValue);
                }
              },
            ),
            SizedBox(
              width: 60,
              child: Center(child: Text(currentValue.toString())),
            ),
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () {
                final newValue = (currentValue + 1);
                if (field.max == null || newValue <= field.max!) {
                  onChanged(field.key, newValue);
                }
              },
            ),
          ],
        ),
      );
    } else if (field is EnumFieldDef) {
      final currentValue = (values[field.key] as String?);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Text(
                  field.label,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (field.required == true)
                  const Text(
                    ' *',
                    style: TextStyle(color: Colors.red),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 8,
              children: field.options.map((option) {
                return ChoiceChip(
                  label: Text(option.label),
                  selected: currentValue == option.value,
                  onSelected: (selected) {
                    if (selected) {
                      onChanged(field.key, option.value);
                    }
                  },
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),
        ],
      );
    }

    return const SizedBox.shrink();
  }
}
