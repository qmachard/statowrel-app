const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/**', '.expo/**'],
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react-native',
              message:
                "Import icons from '@/components/icons' — the barrel evaluates all 3,500+ icons at launch and held the splash screen for tens of seconds.",
            },
          ],
        },
      ],
    },
  },
];
