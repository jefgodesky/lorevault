module.exports = [
  { regex: /\[Intelligence DC (\d*?)\]/mi, stat: 'int' },
  { regex: /\[Arcana DC (\d*?)\]/mi, stat: 'arcana' },
  { regex: /\[History DC (\d*?)\]/mi, stat: 'history' },
  { regex: /\[Nature DC (\d*?)\]/mi, stat: 'nature' },
  { regex: /\[Religion DC (\d*?)\]/mi, stat: 'religion' }
]
