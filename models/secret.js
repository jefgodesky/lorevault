class Secret {
  constructor (obj = {}, codenamer) {
    const { codename = codenamer(), content = '', conditions = '', knowers = [], checked = [] } = obj
    this.codename = codename
    this.content = content
    this.conditions = conditions
    this.knowers = knowers
    this.checked = checked
  }
}

export default Secret
