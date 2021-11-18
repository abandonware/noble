{
  'targets': [
    {
      'target_name': 'noble',
      'conditions': [
        ['OS=="mac"', {
          'dependencies': [
            'lib/mac/binding.gyp:binding',
          ],
        }],
        ['OS=="win"', {
          'dependencies': [
            'lib/win/binding.gyp:binding',
          ],
        }],
      ],
    },
    {
      'target_name': 'noble',
      'conditions': [
        ['OS=="win"', {
          'dependencies': [
            'lib/win/binding.gyp:binding',
          ],
        }],
      ],
    },
  ],
}
