const info = {
  id: 'dnd5e',
  name: 'Dungeons & Dragons',
  edition: '5th edition',
  sheet: [
    {
      id: 'int',
      label: 'Intelligence',
      detail: 'Intelligence Ability Modifier',
      type: Number,
      default: 0
    },
    {
      id: 'arcana',
      label: 'Arcana',
      detail: 'Intelligence (Arcana) Modifier',
      type: Number,
      default: 0
    },
    {
      id: 'history',
      label: 'History',
      detail: 'Intelligence (History) Modifier',
      type: Number,
      default: 0
    },
    {
      id: 'nature',
      label: 'Nature',
      detail: 'Intelligence (Nature) Modifier',
      type: Number,
      default: 0
    },
    {
      id: 'religion',
      label: 'Religion',
      detail: 'Intelligence (Religion) Modifier',
      type: Number,
      default: 0
    }
  ]
}

export {
  info
}
